// Author:CMH
// Title:input image and kernel

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/Grandma-1920.png
// uniform sampler2D u_tex1;

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;//[0~1]
  
  // 計算當前螢幕比例和目標比例
  float currentAspect=u_resolution.x/u_resolution.y;
  float targetAspect=16./9.;
  
  if(currentAspect>targetAspect){
    // 螢幕太寬，裁切左右兩側
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    // 螢幕太窄，裁切上下兩側
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  // 創建遮罩，檢查 UV 是否在 [0,1] 範圍內
  float mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  vec3 color=texture2D(u_tex0,uv).rgb;
  gl_FragColor=vec4(color*mask,1.);// mask 為 0 時顯示黑色
}