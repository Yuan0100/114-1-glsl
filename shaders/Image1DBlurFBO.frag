// Author:CMH
// Title:input image and kernel

#ifdef GL_ES
precision mediump float;
#endif

#if defined(BUFFER_0)
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_frame;
uniform sampler2D u_tex0;// ../data/Grandma-1920.png
uniform sampler2D u_buffer0;

// vec2 pixelization(vec2 uv,float size)//from 1 to 10
// {
  //   vec2 uvs=uv/size;//[0~6]
  //   vec2 ipos=floor(uvs);// get the integer coords
  //   vec2 fpos=fract(uvs);// get the fractional coords
  //   vec2 nuv=ipos*size;
  //   return nuv;
// }

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;//[0~1]
  
  // float currentAspect=u_resolution.x/u_resolution.y;
  // float targetAspect=16./9.;
  // vec2 uv;
  // float mask=1.;
  
  // if(currentAspect>targetAspect){
    //   // 螢幕太寬，左右裁切
    //   float scale=targetAspect/currentAspect;
    //   float xOffset=(1.-scale)/2.;
    //   uv=vec2(xOffset+st.x*scale,st.y);
    //   mask=step(xOffset,st.x)*step(st.x,xOffset+scale);
  // }else{
    //   // 螢幕太高，上下裁切
    //   float scale=currentAspect/targetAspect;
    //   float yOffset=(1.-scale)/2.;
    //   uv=vec2(st.x,yOffset+st.y*scale);
    //   mask=step(yOffset,st.y)*step(st.y,yOffset+scale);
  // }
  
  // ===
  
  // ⚠️ 這樣寫會出錯？
  // float pixelSize=1.;
  // vec2 texel=pixelSize*u_resolution.xy;// 計算每個像素的 UV 偏移量
  
  float pixelSize=1.;
  vec2 texel=pixelSize/u_resolution.xy;
  
  // Gaussian kernels
  float kernel[9];
  kernel[0]=0./16.;kernel[1]=0./16.;kernel[2]=0./16.;
  kernel[3]=4./16.;kernel[4]=8./16.;kernel[5]=4./16.;
  kernel[6]=0./16.;kernel[7]=0./16.;kernel[8]=0./16.;
  
  // 在 shader 的 UV 空間裡，vec2(-1,-1) 代表往左下角移動一個像素（不是數學上的座標系，而是紋理座標系）。
  // 常見的高斯模糊排列：以目前像素為中心，往四周取樣
  vec2 offset[9];
  offset[0]=vec2(-1,-1);
  offset[1]=vec2(0,-1);
  offset[2]=vec2(1,-1);
  offset[3]=vec2(-1,0);
  offset[4]=vec2(0,0);
  offset[5]=vec2(1,0);
  offset[6]=vec2(-1,1);
  offset[7]=vec2(0,1);
  offset[8]=vec2(1,1);
  
  vec3 blurColor=vec3(0.);
  for(int i=0;i<9;i++){
    vec2 sampleUV=uv+offset[i]*texel;
    blurColor+=texture2D(u_buffer0,sampleUV).rgb*kernel[i];
  }
  
  // initial
  if(u_time<1.){
    gl_FragColor=texture2D(u_tex0,uv);
  }else{
    gl_FragColor=vec4(blurColor,1.);
  }
  
  // #if defined(BUFFER_0)
  //   vec3 blurColor=vec3(0.);
  //   for(int i=0;i<9;i++){
    //     vec2 sampleUV=uv+offset[i]*texel;
    //     blurColor+=texture2D(u_buffer0,sampleUV).rgb*kernel[i];
  //   }
  //   gl_FragColor=vec4(blurColor,1.);
  // #else
  //   gl_FragColor=texture2D(u_tex0,uv);
  // #endif
}