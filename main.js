const canvas = document.getElementById("glsl-canvas");

// 調整畫布大小以符合顯示尺寸
function resizeCanvasToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    // 取得 CSS 尺寸（以 CSS 像素計）
    const displayWidth  = Math.round(canvas.clientWidth  * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);

    // 只在需要時調整繪圖緩衝區（以實際像素計）
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }
  }

if (canvas) {
  // 初次設定尺寸 → 再載入 shader
  resizeCanvasToDisplaySize();
  const sandbox = new GlslCanvas(canvas);

  // 之後維持同步（可用 ResizeObserver 或 onresize）
  const ro = new ResizeObserver(() => resizeCanvasToDisplaySize());
  ro.observe(canvas);
  window.addEventListener('resize', resizeCanvasToDisplaySize);
} else {
  console.error('Canvas element with id "glsl-canvas" not found.');
}