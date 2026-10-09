// Only oversized JSON routes invoke this handler. Everything else stays static.
export function createPagesAssetHandler(manifest) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url)
      const asset = Object.hasOwn(manifest, url.pathname) ? manifest[url.pathname] : null
      if (!asset) return env.ASSETS.fetch(request)
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
      }
      const etag = `"${asset.sha256}"`
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        ETag: etag,
      }
      if (request.headers.get('If-None-Match')?.split(',').some(value => ['*', etag, `W/${etag}`].includes(value.trim()))) {
        return new Response(null, { status: 304, headers })
      }
      headers['Content-Length'] = String(asset.size)
      if (request.method === 'HEAD') return new Response(null, { headers })

      // Fetch one part at a time: bounded memory and one open asset connection.
      let partIndex = 0
      let partBytes = 0
      let reader
      async function openPart() {
        const part = asset.parts[partIndex]
        const response = await env.ASSETS.fetch(new Request(new URL(part.path, url), {
          method: 'GET', headers: { 'Accept-Encoding': 'identity' },
        }))
        const length = response.headers.get('Content-Length')
        if (response.status !== 200 || !response.body || (length !== null && Number(length) !== part.size)) {
          if (response.body) await response.body.cancel()
          throw new Error(`Missing or invalid asset part ${partIndex}`)
        }
        reader = response.body.getReader()
        partBytes = 0
      }
      try {
        await openPart()
      } catch (error) {
        console.error(JSON.stringify({ event: 'pages_asset_unavailable', path: url.pathname, message: error.message }))
        return new Response('Example package temporarily unavailable', {
          status: 502, headers: { 'Cache-Control': 'no-store' },
        })
      }
      const body = new ReadableStream({
        async pull(controller) {
          try {
            while (partIndex < asset.parts.length) {
              const { done, value } = await reader.read()
              if (!done) {
                partBytes += value.byteLength
                if (partBytes > asset.parts[partIndex].size) throw new Error('Asset part exceeds expected size')
                controller.enqueue(value)
                return
              }
              if (partBytes !== asset.parts[partIndex].size) throw new Error('Truncated asset part')
              reader.releaseLock()
              partIndex++
              if (partIndex < asset.parts.length) await openPart()
            }
            controller.close()
          } catch (error) {
            console.error(JSON.stringify({ event: 'pages_asset_stream_failed', path: url.pathname, message: error.message }))
            await reader.cancel().catch(() => {})
            controller.error(error)
          }
        },
        async cancel(reason) {
          await reader.cancel(reason)
        },
      })
      return new Response(body, { headers })
    },
  }
}
