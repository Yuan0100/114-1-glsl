// 隨機數生成函式
float rand(vec2 co){
  return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}

// --- 玻璃效果函式 ---
// 輸入: 材質、UV座標、時間
// 輸出: 套用玻璃效果後的顏色
vec3 applyGlassEffect(sampler2D tex,vec2 uv,float time){
  vec3 effect_color=vec3(0.);
  float total_weight=0.;
  
  float random_factor=rand(vec2(floor(uv.x*GROOVES_DENSITY),0.));
  random_factor=mix(1.-u_distortion_amount,1.,random_factor);
  float static_groove_shape=sin(uv.x*GROOVES_DENSITY)*random_factor;
  
  for(float i=-BLUR_SAMPLE_COUNT;i<=BLUR_SAMPLE_COUNT;i+=1.){
    vec2 sample_uv=uv;
    float groove_offset=static_groove_shape*u_refraction_strength;
    float wind_wave=sin(sample_uv.y*WIND_FREQUENCY+time*u_wind_speed);
    float wind_offset=wind_wave*u_refraction_strength*.5;
    float y_total_offset=groove_offset+wind_offset+(i*u_refraction_strength*.1);
    
    sample_uv.y+=y_total_offset;
    
    vec3 sampled_color=texture2D(tex,sample_uv).rgb;
    float contrast_factor=1.+BRIGHTNESS_CONTRAST*abs(static_groove_shape);
    
    effect_color+=sampled_color*contrast_factor;
    total_weight+=1.;
  }
  
  return effect_color/total_weight;
}