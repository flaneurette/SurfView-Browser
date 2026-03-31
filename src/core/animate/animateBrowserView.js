function animateBrowserView(browserView, targetBounds, options = {}) {
  
  const {
    duration = 400,      // ms
    easing = 'easeInOut',
    onDone = () => {}
  } = options

  const startBounds = browserView.getBounds()
  const easeFn = easings[easing] ?? easings.easeInOut
  const fps = 60
  const intervalMs = 1000 / fps
  const steps = Math.round(duration / intervalMs)
  let count = 0

  const interval = setInterval(() => {
    count++
    const progress = Math.min(count / steps, 1)
    const eased = easeFn(progress)

    browserView.setBounds({
      x:      Math.round(startBounds.x      + (targetBounds.x      - startBounds.x)      * eased),
      y:      Math.round(startBounds.y      + (targetBounds.y      - startBounds.y)      * eased),
      width:  Math.round(startBounds.width  + (targetBounds.width  - startBounds.width)  * eased),
      height: Math.round(startBounds.height + (targetBounds.height - startBounds.height) * eased),
    })

    if (count >= steps) {
      clearInterval(interval)
      browserView.setBounds(targetBounds) // snap clean
      onDone()
    }
  }, intervalMs)

  // Return cancel function
  return () => clearInterval(interval)
}

