// Author:CMH
// Title:input image and kernel

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/Cat.png
// uniform sampler2D u_tex1;

// 雙色調顏色定義
const vec3 COLD_TONE_COLOR=vec3(.3529,.5529,.8941);// 藍色
const vec3 WARM_TONE_COLOR=vec3(1.,.5059,.7922);// 橘紅色

// 模糊和位移強度
const float u_blur_strength=.01;// 整體模糊強度 (例如: 0.01 - 0.05)
const float u_distortion_strength=.02;// 顏色位移/色散強度 (例如: 0.02)
const float u_split_point=.6;// 藍紅分界點的X座標 (例如: 0.6)
const float u_transition_width=.1;// 分界點過渡區域寬度 (例如: 0.1)

// 簡單的隨機數生成函數 (用於更自然的擾動，如果需要)
float rand(vec2 co)
{
  return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;
  
  // 1. 處理比例適應 (Aspect Ratio Adjustment)
  float currentAspect=u_resolution.x/u_resolution.y;
  float targetAspect=1./1.;// 假設目標是正方形，你可以根據實際圖片比例調整
  
  if(currentAspect>targetAspect){
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  // 創建遮罩 (Masking)，確保 UV 在 [0,1] 範圍內
  float bounds_mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  // 2. 決定藍紅分界線
  // 使用 smoothstep 創建一個從 0 到 1 的平滑過渡
  // 当 uv.x < (u_split_point - u_transition_width) 时，mask_factor 为 0 (偏暖色)
  // 当 uv.x > u_split_point 时，mask_factor 为 1 (偏冷色)
  float mask_factor=smoothstep(u_split_point-u_transition_width,u_split_point,uv.x);
  
  // 3. 採樣原始顏色並應用區域性模糊/位移
  
  vec2 offset_uv=uv;
  // 只有在左側 (mask_factor 接近 0，即暖色區域) 應用模糊和位移
  // 這裡使用 (1.0 - mask_factor) 讓效果在左側最強，向右逐漸減弱
  
  // a. 簡單的顏色位移/色散
  // 讓紅、綠、藍通道採樣略微不同的位置
  vec2 distortion_offset=vec2(u_distortion_strength*(1.-mask_factor),u_distortion_strength*(1.-mask_factor)*.5);
  
  vec3 r_channel=texture2D(u_tex0,uv+distortion_offset*1.).rgb;// 紅色通道可能偏移大一點
  vec3 g_channel=texture2D(u_tex0,uv+distortion_offset*.5).rgb;// 綠色通道偏移小一點
  vec3 b_channel=texture2D(u_tex0,uv-distortion_offset*.5).rgb;// 藍色通道反方向偏移
  
  // 簡單的模糊 (這裡用多重採樣模擬，但為了性能，通常用 Box Blur Kernel)
  // 這裡我們直接採樣一個稍微偏移的點作為模糊的基底
  // 更複雜的模糊需要一個迴圈來採樣多個點
  vec3 blur_color=texture2D(u_tex0,uv+vec2(u_blur_strength*(1.-mask_factor),0.)).rgb;
  
  // 混合原始採樣和模糊採樣，讓左側更模糊
  vec3 original_color=mix(texture2D(u_tex0,uv).rgb,blur_color,(1.-mask_factor)*.8);// 80% 模糊
  
  // 4. 雙色調映射
  // 計算原始顏色的亮度
  float luminance=dot(original_color,vec3(.2126,.7152,.0722));
  
  // 根據亮度，將顏色映射到藍色或橘紅色調
  // 這裡使用 power 函數調整亮度對比，讓效果更明顯
  float remapped_luminance=pow(luminance,1.2);
  
  // 使用 mask_factor 混合冷色和暖色
  // 左側 (mask_factor 接近 0) 使用暖色調
  // 右側 (mask_factor 接近 1) 使用冷色調
  vec3 final_color_unmasked=mix(mix(vec3(0.),WARM_TONE_COLOR,remapped_luminance),// 左側暖色調
  mix(vec3(0.),COLD_TONE_COLOR,remapped_luminance),// 右側冷色調
mask_factor);

// 為了模擬更強烈的對比和色彩滲透，我們可以讓顏色通道之間進行更積極的混合
// 例如，讓紅色通道受藍色影響，藍色通道受紅色影響
vec3 combined_color=vec3(
  mix(r_channel.r,b_channel.r,mask_factor*.5),// 紅色受藍色影響
  g_channel.g,// 綠色保持中立
  mix(b_channel.b,r_channel.b,(1.-mask_factor)*.5)// 藍色受紅色影響
);

// 再次計算 combined_color 的亮度
float combined_luminance=dot(combined_color,vec3(.2126,.7152,.0722));
combined_luminance=pow(combined_luminance,1.2);

// 最終混合
vec3 final_color=mix(mix(vec3(0.),WARM_TONE_COLOR,combined_luminance),// 左側暖色調
mix(vec3(0.),COLD_TONE_COLOR,combined_luminance),// 右側冷色調
mask_factor);

// 輸出最終顏色，並套用邊界遮罩
gl_FragColor=vec4(final_color*bounds_mask,1.);
}