#ifdef GL_ES
precision mediump float;
#endif

// ------------------------------------
// 1. Uniform 變數 (從 CPU/JS 傳入控制)
// ------------------------------------

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/reference/CMH.png

// 玻璃和風動參數
const float u_refraction_strength=.05;// 折射強度 (例如: 0.01)
const float u_distortion_amount=.4;// 紋路隨機變形強度 (例如: 0.5)
const float u_wind_speed=.5;// 新增: 風動速度 (例如: 1.0)
const float u_exposure_boost=1.5;// 曝光增益 (例如: 0.1 - 0.3)

// 陽光控制
const float u_sun_intensity=.8;// 陽光亮度 (例如: 0.3)
const float u_sun_sharpness=1.;// 光線邊緣銳利度 (例如: 1.2)
const vec2 u_light_end=vec2(0.,1.);// 光線最暗處的 UV 座標 (P2)
const vec2 u_light_start=vec2(.6,0.);// 光線最亮處的 UV 座標 (P1)
const float u_light_width=.2;// 光線的寬度 (例如: 0.2 - 0.5)
const vec3 u_sun_color=vec3(.8784,.5922,.8667);// 陽光顏色 (淡黃色)

// ------------------------------------
// 2. 常量 (固定參數)
// ------------------------------------

// 區域限制參數
const float EFFECT_END_X=.6;// 效果結束的X座標 (3/4 處)
const float BLEND_WIDTH=.1;// 混合過渡區域的寬度

// 玻璃紋理常量
const float GROOVES_DENSITY=40.;//垂直紋路密度 (數值越大，紋路越密)
const float BLUR_SAMPLE_COUNT=3.;//模糊採樣點數量 (建議 3.0 到 5.0，數值越大越模糊但性能消耗越大)
const float BRIGHTNESS_CONTRAST=.3;// 紋路邊緣的明暗對比強度
const float WIND_FREQUENCY=30.;//風動波浪的頻率

// 顏色定義
const vec3 COLD_TONE_COLOR=vec3(.2745,.7098,1.);// 藍色
const vec3 WARM_TONE_COLOR=vec3(.9686,.3529,.2118);// 橘紅色
const float GLOBAL_COOLING_FACTOR=.5;

// ------------------------------------
// 3. 輔助函數
// ------------------------------------

// 簡單的隨機數生成函數
float rand(vec2 co)
{
  return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}

// 自定義陽光照射函數 (含寬度控制)
vec3 applyCustomSunlight(vec3 color,vec2 uv){
  // 1. 計算光線軸向量 D (從 P1 到 P2)
  vec2 D=u_light_end-u_light_start;
  float len_sq=dot(D,D);
  
  if(len_sq<.00001){return color;}// P1=P2，無光線
  
  // 2. 計算向量 V (從 P1 到當前像素 uv)
  vec2 V=uv-u_light_start;
  
  // 3. 計算標量投影 t (沿著光軸 D 的位置)
  float t=dot(V,D)/len_sq;
  
  // 4. 計算垂直距離 s (垂直於光軸 D 的距離)
  vec2 P_to_D=V-D*t;
  float s=length(P_to_D);// 垂直距離
  
  // 5. 建立光線遮罩
  
  // a. 沿軸遮罩 (Axial Mask): P1 處為 1.0，P2 處為 0.0
  float axial_mask=1.-t;
  axial_mask=clamp(axial_mask,0.,1.);
  
  // b. 寬度遮罩 (Width Mask): 根據 s 和 u_light_width 衰減
  // 使用 smoothstep 創建柔和邊緣，光線由中心向外衰減
  float width_mask=smoothstep(u_light_width,u_light_width*.5,s);// 0.5*width 是羽化區域
  
  // c. 最終遮罩 = 沿軸遮罩 * 寬度遮罩
  float light_mask=axial_mask*width_mask;
  
  // 6. 調整銳利度和應用
  light_mask=pow(light_mask,u_sun_sharpness);
  light_mask=clamp(light_mask,0.,1.);
  
  // ------------------------------------------------------------------
  // 柔和疊加邏輯
  // ------------------------------------------------------------------
  
  // 1. 原始顏色的亮度 (越高越白)
  float lum=dot(color,vec3(.2126,.7152,.0722));
  
  // 2. 準備兩種增益顏色:
  
// a) 彩色增益: 適用於暗處 (將光線顏色疊加到原圖上)
vec3 color_boosted=color+u_sun_color*light_mask*u_sun_intensity;

// b) 亮度增益: 適用於亮處 (將光線只作為白色增亮)
vec3 white_boosted=color+light_mask*u_sun_intensity*vec3(1.);// vec3(1.0) 確保它是白色增益

// 3. 使用原始亮度 lum 混合兩種增益顏色
// 當 lum = 0 (純黑/陰影) -> 傾向使用 color_boosted (彩色光著色)
// 當 lum = 1 (純白/高光) -> 傾向使用 white_boosted (白色光增亮)
vec3 final_color=mix(color_boosted,white_boosted,lum);

return final_color;
}

// ------------------------------------
// 4. 主程式
// ------------------------------------

void main(){
vec2 st=gl_FragCoord.xy/u_resolution.xy;
vec2 uv=st;

// 處理比例適應 (保留比例適應邏輯)
float currentAspect=u_resolution.x/u_resolution.y;
float targetAspect=1./1.;

if(currentAspect>targetAspect){
float scale=currentAspect/targetAspect;
uv.x=(uv.x-.5)*scale+.5;
}else{
float scale=targetAspect/currentAspect;
uv.y=(uv.y-.5)*scale+.5;
}

float mask=step(0.,uv.x)*step(uv.x,1.)*
step(0.,uv.y)*step(uv.y,1.);

// 採樣原始顏色
vec3 original_color_raw=texture2D(u_tex0,uv).rgb;

// ** 步驟 1: 應用自定義陽光照射效果 (對原始顏色) **
vec3 original_color_sunlit=applyCustomSunlight(original_color_raw,uv);

// 全局冷色調 (應用在陽光效果之後)
vec3 original_color_cooled=mix(original_color_sunlit,COLD_TONE_COLOR,GLOBAL_COOLING_FACTOR);

// 2. 靜態紋路形狀與隨機因子計算
vec3 effect_color=vec3(0.);
float total_weight=0.;

float random_factor=rand(vec2(floor(uv.x*GROOVES_DENSITY),0.));
random_factor=mix(1.-u_distortion_amount,1.,random_factor);

float base_wave=sin(uv.x*GROOVES_DENSITY);
float static_groove_shape=base_wave*random_factor;

// 3. 多重採樣與風動效果應用
for(float i=-BLUR_SAMPLE_COUNT;i<=BLUR_SAMPLE_COUNT;i+=1.){
vec2 sample_uv=uv;

// 玻璃與風動偏移計算
float groove_offset=static_groove_shape*u_refraction_strength;
float wind_wave=sin(sample_uv.y*WIND_FREQUENCY+u_time*u_wind_speed);
float wind_offset=wind_wave*u_refraction_strength*.5;
float y_total_offset=groove_offset+wind_offset+(i*u_refraction_strength*.1);

sample_uv.y+=y_total_offset;

// ** 採樣扭曲後的座標 **
vec3 sampled_color_raw=texture2D(u_tex0,sample_uv).rgb;

// ** 步驟 2: 陽光也跟著扭曲 **
vec3 sampled_color_sunlit=applyCustomSunlight(sampled_color_raw,sample_uv);

// 雙色調映射 (Duotone Mapping)
float luminance=dot(sampled_color_sunlit,vec3(.2126,.7152,.0722));
vec3 duotone_color=mix(COLD_TONE_COLOR*luminance,WARM_TONE_COLOR*luminance,luminance);

// 紋路明暗對比
float contrast_factor=1.+BRIGHTNESS_CONTRAST*abs(static_groove_shape);
vec3 final_sampled_color=duotone_color*contrast_factor;

effect_color+=final_sampled_color;
total_weight+=1.;
}

// 歸一化後的玻璃效果顏色
effect_color/=total_weight;

// 增加曝光 (只對左側玻璃效果區域)
effect_color*=(1.+u_exposure_boost);

// 4. 限制區域與混合
float blend_factor=smoothstep(EFFECT_END_X,EFFECT_END_X-BLEND_WIDTH,uv.x);

// 混合最終顏色
vec3 final_color=mix(original_color_cooled,effect_color,blend_factor);

// 輸出最終顏色
gl_FragColor=vec4(final_color*mask,1.);
}