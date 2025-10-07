#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;//../data/reference/CMH.png
uniform sampler2D u_tex1;//../data/reference/MonaLisa.jpg

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;//[0~1]
  vec2 mouse=u_mouse.xy/u_resolution.xy;
  vec2 texel=1./u_resolution.xy;
  
  // Multi-scale Gaussian kernels
  float kernelSmall[9];
  kernelSmall[0]=1./16.;kernelSmall[1]=2./16.;kernelSmall[2]=1./16.;
  kernelSmall[3]=2./16.;kernelSmall[4]=4./16.;kernelSmall[5]=2./16.;
  kernelSmall[6]=1./16.;kernelSmall[7]=2./16.;kernelSmall[8]=1./16.;
  
  float kernelLarge[9];
  kernelLarge[0]=1./64.;kernelLarge[1]=6./64.;kernelLarge[2]=1./64.;
  kernelLarge[3]=6./64.;kernelLarge[4]=36./64.;kernelLarge[5]=6./64.;
  kernelLarge[6]=1./64.;kernelLarge[7]=6./64.;kernelLarge[8]=1./64.;
  
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
  
  // Low pass: combine small and large blur on u_tex0
  vec3 blurSmall=vec3(0.);
  vec3 blurLarge=vec3(0.);
  for(int i=0;i<9;i++){
    vec2 sampleUV=uv+offset[i]*texel;
    blurSmall+=texture2D(u_tex1,sampleUV).rgb*kernelSmall[i];
    blurLarge+=texture2D(u_tex1,sampleUV).rgb*kernelLarge[i];
  }
  vec3 lowpass=.5*blurSmall+.5*blurLarge;
  
  // High pass: small kernel on u_tex1
  float strength=2.5;// Increase this value for even stronger effect
  float kernel[9];
  kernel[0]=-1.*strength;kernel[1]=-1.*strength;kernel[2]=-1.*strength;
  kernel[3]=-1.*strength;kernel[4]=8.*strength;kernel[5]=-1.*strength;
  kernel[6]=-1.*strength;kernel[7]=-1.*strength;kernel[8]=-1.*strength;
  vec3 highpass=vec3(0.);
  for(int i=0;i<9;i++){
    vec2 sampleUV=uv+offset[i]*texel;
    highpass+=texture2D(u_tex0,sampleUV).rgb*kernel[i];
  }
  
  // Multi-scale hybrid blend
  float lowpassWeight=1.-.5*mouse.y;//0.0;
  float highpassWeight=mouse.y+.5;//1.0;
  vec3 hybrid=lowpass*lowpassWeight+highpass*highpassWeight;
  //vec3 hybrid = max(lowpass * lowpassWeight, highpassWeight*highpass);
  gl_FragColor=vec4(hybrid,1.);
}