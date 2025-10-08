async function processIIIFImageUrl(imgUrl) {
  try {
    const response = await fetch(imgUrl)

    if (!response.ok) {
      return imgUrl
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json') || contentType?.includes('application/ld+json')) {
      const imageData = await response.json()
      if (isIIIFImageInfo(imageData)) {
        return constructIIIFImageUrl(imageData)
      }
    }
    return imgUrl
  } catch (error) {
    console.warn('Error processing IIIF image URL:', error)
    return imgUrl
  }
}

function isIIIFImageInfo(data) {
  return (
    (data.type === "ImageService3" || data["@type"] === "ImageService3") ||
    (data["@context"] && (
      data["@context"].includes("iiif.io/api/image/2") ||
      data["@context"].includes("iiif.io/api/image/3")
    )) ||
    (data["@id"])
  )
}

function constructIIIFImageUrl(imageData) {
  const baseUrl = imageData["@id"] || imageData.id
  const imageWidth = imageData.width
  const imageHeight = imageData.height

  if (!baseUrl) {
    throw new Error("No base URL found in IIIF Image API info")
  }

  const imageUrl = `${baseUrl}/full/${imageWidth},${imageHeight}/0/default.jpg`
  return imageUrl
}

window.addEventListener("message", async (event) => {
  if (!event?.data) return
  const container = document.getElementById("compare-page")
  if (event.data.type === "CANVASES") {
    try {
      const canvases = event.data.canvases || []
      container.innerHTML = ""

      if (canvases.length === 0) {
        container.innerHTML = '<div class="empty">No pages to compare</div>'
        return
      }

      const item = document.createElement("div")
      item.classList.add("compare-page-item")

      const canvasDropdown = document.createElement("select")
      canvases.forEach((canvas, index) => {
        const option = document.createElement("option")
        option.value = index
        option.text = canvas.label || `Canvas ${index + 1}`
        canvasDropdown.appendChild(option)
      })

      canvasDropdown.addEventListener("change", async (e) => {
        const selectedIndex = e.target.value
        const selectedCanvas = canvases[selectedIndex]
        try {
          const response = await fetch(selectedCanvas.id)
          const data = await response.json()
          const imageUrl =
            data?.items?.[0]?.items?.[0]?.body?.id ??
            data?.images?.[0]?.resource?.["@id"] ??
            data?.images?.[0]?.resource?.id

          if (!imageUrl) {
            console.warn("No image found for this canvas.")
            return
          }

          const processedImageUrl = await processIIIFImageUrl(imageUrl, 800, 1000)

          let image = item.querySelector("img")
          if (!image) {
            image = document.createElement("img")
            item.appendChild(image)
          }

          image.src = processedImageUrl
          image.alt = selectedCanvas.label || "Canvas image"
        } catch (err) {
          console.error("Error fetching canvas image:", err)
        }
      })
      canvasDropdown.dispatchEvent(new Event("change"))
      item.appendChild(canvasDropdown)
      container.appendChild(item)
    } catch (error) {
      console.error("Error processing canvases:", error)
    }
  }
})
