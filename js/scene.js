// contains code from:
// https://developer.mozilla.org/samples/webgl/sample5/
// http://david.li/flow/
// underscore.js

(function(window){

function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

function initWebGL(canvas) {
  var gl = null;
  
  try {
    gl = canvas.getContext("webgl", {antialias: false});
  }
  catch(e) {
  }
    
  if (!gl) {
    // no gl support
    console.log("no gl support");
  }

  return gl;
}

function getShader(gl, name, type) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource[name]);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

var shaderSource = {
  celFragment: [
    'varying mediump vec4 vNormal;',
    'varying lowp vec4 vLightDirection;',
    'varying mediump vec4 vCameraDirection;',

    'uniform lowp vec3 UaColor;',
    'uniform lowp vec3 UdColor;',
    'uniform lowp vec3 UsColor;',
    'uniform lowp float Ushine;',

    'void main()',
    '{',
    //'  if(dot(normalize(vNormal), normalize(vCameraDirection)) < 0.1) {',
    //'    discard;',
    //'  } else {',
    '    lowp vec3 col = vec3(',
    '        max(0.0, dot(normalize(vNormal), normalize(vLightDirection)))*UdColor //diffused',
    '        + UaColor // ambient',
    '        + pow(',
    '            max(0.0, dot(normalize(normalize(vLightDirection) + normalize(vCameraDirection)), normalize(vNormal))),',
    '            Ushine',
    '        ) * UsColor // specular',
    '     );',

    '    gl_FragColor = vec4(UdColor * ceil(length(col)*4.0)/5.0 * (length(col)+3.0)/4.0,1.0);',
    //'  }',
    '}'
  ].join("\n"),

  celVertex: [
    'attribute vec3 aVertexPosition;',
    'attribute vec3 aVertexNormal;',

    'uniform mat4 uPMatrix;',
    'uniform mat4 uVMatrix;',
    'uniform mat4 uMMatrix;',

    'uniform lowp vec3 uLightPos;',

    'varying mediump vec4 vNormal;',
    'varying lowp vec4 vLightDirection;',
    'varying mediump vec4 vCameraDirection;',

    'void main()',
    '{',
    '  gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aVertexPosition, 1.0);',
    '    lowp vec4 transformedNormal = normalize(uVMatrix * uMMatrix * vec4(aVertexNormal, 0));',
    '    lowp vec4 transformedPosition = uVMatrix * uMMatrix * vec4(aVertexPosition, 1.0);',
    '    lowp vec4 lightDirection = normalize(uVMatrix * vec4(uLightPos, 1) - transformedPosition);',
    '    lowp vec4 cameraDirection = normalize(vec4(0, 0, 0, 1) - transformedPosition);',
    '    vNormal = transformedNormal;',
    '    vLightDirection = lightDirection;',
    '    vCameraDirection = cameraDirection;',
    '}'
  ].join("\n"),

  borderFragment: [
    'varying mediump vec4 vNormal;',
    'varying lowp vec4 vLightDirection;',
    'varying mediump vec4 vCameraDirection;',

    'uniform lowp vec3 UaColor;',
    'uniform lowp vec3 UdColor;',
    'uniform lowp vec3 UsColor;',
    'uniform lowp float Ushine;',

    'void main()',
    '{',
    //'  if(dot(normalize(vNormal), normalize(vCameraDirection)) > 0.0) {',
    //'    discard;',
    //'  } else {',
    '    gl_FragColor = vec4(0.0,0.0,0.0,1.0);',
    //'  }',
    '}'
  ].join("\n"),

  borderVertex: [
    'attribute vec3 aVertexPosition;',
    'attribute vec3 aVertexNormal;',

    'uniform mat4 uPMatrix;',
    'uniform mat4 uVMatrix;',
    'uniform mat4 uMMatrix;',

    'uniform lowp vec3 uLightPos;',
    'uniform lowp float uBorderThickness;',

    'varying mediump vec4 vNormal;',
    'varying lowp vec4 vLightDirection;',
    'varying mediump vec4 vCameraDirection;',

    'void main()',
    '{',
    '  lowp vec4 transformedPosition = uVMatrix * uMMatrix * vec4(aVertexPosition + normalize(aVertexNormal) * uBorderThickness, 1.0);',
    '  lowp vec4 transformedNormal = uVMatrix * uMMatrix * vec4(aVertexNormal, 0);',
    '  vCameraDirection = normalize(vec4(0, 0, 0, 1) - transformedPosition);',
    '  gl_Position = uPMatrix * transformedPosition + vec4(0,0,0.5*uBorderThickness,0);',
    '  vNormal = normalize(transformedNormal);',
    '}'
  ].join("\n"),

  postFragment: [ // https://github.com/mitsuhiko/webgl-meincraft/blob/master/assets/shaders/fxaa.glsl
    'uniform lowp float w;',
    'uniform lowp float h;',
    'uniform sampler2D tex0;',
    'uniform sampler2D tex1;',

    '#ifndef FXAA_GLSL_INCLUDED',
    '#define FXAA_GLSL_INCLUDED',

    '#define FXAA_REDUCE_MIN   (1.0/ 128.0)',
    '#define FXAA_REDUCE_MUL   (1.0 / 8.0)',
    '#define FXAA_SPAN_MAX     8.0',

    'lowp vec2 distortFragCoord(lowp vec2 fragCoord) {',
    '  lowp vec4 blur = texture2D(tex1, vec2(fragCoord.x, fragCoord.y));',
    '  return vec2((fragCoord.x + blur.r*blur.r*0.02), (fragCoord.y + blur.r*blur.r*0.04));',
    '}',

    'lowp vec4 applyFXAA(lowp vec2 fragCoord, sampler2D tex)',
    '{',
    '    lowp vec4 color;',
    '    lowp vec2 inverseVP = vec2(1.0 / w, 1.0 / h);',
    '    lowp vec3 rgbNW = texture2D(tex, distortFragCoord((fragCoord + vec2(-1.0, -1.0)) * inverseVP)).xyz;',
    '    lowp vec3 rgbNE = texture2D(tex, distortFragCoord((fragCoord + vec2(1.0, -1.0)) * inverseVP)).xyz;',
    '    lowp vec3 rgbSW = texture2D(tex, distortFragCoord((fragCoord + vec2(-1.0, 1.0)) * inverseVP)).xyz;',
    '    lowp vec3 rgbSE = texture2D(tex, distortFragCoord((fragCoord + vec2(1.0, 1.0)) * inverseVP)).xyz;',
    '    lowp vec3 rgbM  = texture2D(tex, distortFragCoord(fragCoord * inverseVP)).xyz;',
    '    lowp vec3 luma = vec3(0.299, 0.587, 0.114);',
    '    lowp float lumaNW = dot(rgbNW, luma);',
    '    lowp float lumaNE = dot(rgbNE, luma);',
    '    lowp float lumaSW = dot(rgbSW, luma);',
    '    lowp float lumaSE = dot(rgbSE, luma);',
    '    lowp float lumaM  = dot(rgbM,  luma);',
    '    lowp float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));',
    '    lowp float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));',
    '    ',
    '    lowp vec2 dir;',
    '    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));',
    '    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));',
    '    ',
    '    lowp float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *',
    '                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);',
    '    ',
    '    lowp float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);',
    '    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),',
    '              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),',
    '              dir * rcpDirMin)) * inverseVP;',
    '      ',
    '    lowp vec3 rgbA = 0.5 * (',
    '        texture2D(tex, distortFragCoord(fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5))).xyz +',
    '        texture2D(tex, distortFragCoord(fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5))).xyz);',
    '    lowp vec3 rgbB = rgbA * 0.5 + 0.25 * (',
    '        texture2D(tex, distortFragCoord(fragCoord * inverseVP + dir * -0.5)).xyz +',
    '        texture2D(tex, distortFragCoord(fragCoord * inverseVP + dir * 0.5)).xyz);',
    '    lowp float lumaB = dot(rgbB, luma);',
    '    if ((lumaB < lumaMin) || (lumaB > lumaMax))',
    '        color = vec4(rgbA, 1.0);',
    '    else',
    '        color = vec4(rgbB, 1.0);',
    '    return color;',
    '}',
    '#endif',



    'void main(void) {',
    '  lowp vec4 blur = texture2D(tex1, vec2(gl_FragCoord.x/w, gl_FragCoord.y/h));',
    '  lowp vec4 col = applyFXAA(vec2(gl_FragCoord.x, gl_FragCoord.y), tex0);',
    '  gl_FragColor = vec4(clamp(col.r+blur.r*(1.0-col.r)*0.75,0.0,1.0), clamp(col.g+blur.r*(1.0-col.g)*0.75,0.0,1.0), clamp(col.b+blur.r*(1.0-col.b)*0.75,0.0,1.0), 1.0);',
    '}'
  ].join("\n"),

  postVertex: [
    'attribute vec2 aVertexPosition;',
    'attribute vec3 aVertexNormal;',

    'void main(void) {',
    '  gl_Position = vec4(aVertexPosition, 0, 1);',
    '  aVertexNormal;',
    '}'
  ].join("\n"),

  pictureFragment: [
    'uniform sampler2D tex;',
    'varying mediump vec2 texCoord;',

    'void main()',
    '{',
    '  gl_FragColor = texture2D(tex, texCoord);',
    '}'
  ].join("\n"),

  pictureVertex: [
    'attribute vec3 aVertexPosition;',
    'attribute vec3 aVertexNormal;',

    'uniform mat4 uPMatrix;',
    'uniform mat4 uVMatrix;',
    'uniform mat4 uMMatrix;',

    'varying mediump vec2 texCoord;',

    'void main(void) {',
    '  gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aVertexPosition, 1);',
    '  texCoord = vec2(aVertexNormal.x, aVertexNormal.y);', // hack: pass in the texture coords as normals for now, can be generalized later
    '}'
  ].join("\n"),

  blurFragment: [
    'varying mediump vec2 weight;',
    'uniform lowp float uLife;',

    'void main()',
    '{',
    '  gl_FragColor = vec4(1.0,0.0,0.0,uLife*clamp(0.5-2.5*((0.5-weight.x)*(0.5-weight.x)+(0.5-weight.y)*(0.5-weight.y)),0.0,1.0));',
    '}'
  ].join("\n"),

  blurVertex: [
    'attribute vec3 aVertexPosition;',
    'attribute vec3 aVertexNormal;',

    'uniform mat4 uPMatrix;',
    'uniform mat4 uVMatrix;',
    'uniform mat4 uMMatrix;',

    'varying mediump vec2 weight;',

    'void main(void) {',
    '  gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aVertexPosition, 1);',
    '  weight = vec2(aVertexNormal.x, aVertexNormal.y);', // hack: pass in the texture coords as normals for now, can be generalized later
    '}'
  ].join("\n")
};

window._vcScene = function(canvasId, textureImgs) {
  var scene = this;

  this.textureImgs = textureImgs;
  this.canvas = $("#" + canvasId)[0];
  this.gl = initWebGL(this.canvas);

  if (this.gl) {

    this.gl.enable (this.gl.BLEND);
    this.gl.blendFunc (this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // SETUP FRAME BUFFERS FOR POST PROCESSING
    this.size = this.powerOf2(window.innerWidth * (window.devicePixelRatio || 1));

    this.framebuffer = this.gl.createFramebuffer();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

    this.framebufferTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebufferTexture);
    //these properties let you upload textures of any size
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    //these determine how interpolation is made if the image is being scaled up or down
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.size, this.size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.renderbuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.renderbuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.size, this.size);

    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.framebufferTexture, 0);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.renderbuffer);

    this.screenVertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.screenVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), this.gl.STATIC_DRAW);



    // SETUP FRAME BUFFERS FOR BLURS
    this.blurFramebuffer = this.gl.createFramebuffer();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.blurFramebuffer);

    this.blurFramebufferTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurFramebufferTexture);
    //these properties let you upload textures of any size
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    //these determine how interpolation is made if the image is being scaled up or down
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.size, this.size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.blurRenderbuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.blurRenderbuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.size, this.size);

    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.blurFramebufferTexture, 0);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.blurRenderbuffer);


    // SETUP SCENE GRAPH
    this.programs = {};
    this.buffers = {};
    this.objects = {};
    this.textures = {};
    this.allObjects = [];
    this.blurs = [];

    // global shaders and buffers that we rely on
    this.initBuffer("face");
    this.initShader("post");
    this.initShader("blur");

    // hardcoded scene
    this.setupScene();

    // events
    $(window).on('resize', debounce(function(){scene.resize();}, 30, false));
    this.resize();

    this.mouseX = 0;
    this.mouseY = 0;
    $(document).on('mousemove', function(event) {
      scene.mouseX = event.pageX;
      scene.mouseY = event.pageY;
    });

    setInterval(function(){scene.drawScene();}, 20);
  }
};

window._vcScene.prototype = {
  setupScene: function() {
    this.gl.clearDepth(1.0);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    this.initTexture("picture");

    this.initShader("cel");
    this.initShader("border");
    this.initShader("picture");

    this.initBuffer("mug");
    this.initBuffer("cube");
    this.initBuffer("jellyfish");
    this.initBuffer("coffee");

    var coffee1 = new Coffee();
    var coffee2 = new Coffee();

    var box1 = new Mug(1, this, coffee1);
    var box2 = new Mug(-1, this, coffee2);
    var table = new Table();
    var picture1 = new Picture(this.textures["picture"], 7.7, 1.5);
    var picture2 = new Picture(this.textures["picture"], -7.7, 1.5);

    this.objects.cel = {
      mug: [box1, box2],
      cube: [table],
      coffee: [coffee1, coffee2],
      face: [],
      jellyfish: []
    };
    this.objects.border = {
      mug: [box1, box2]
    };
    this.objects.picture = {
      face: [picture1, picture2]
    };
    this.allObjects.push(box1, box2, table, picture1, picture2, coffee1, coffee2);

    //var useBoids = true;
    var useBoids = true;
    if(useBoids) {
        var boids = new Boids(-6);
        var boids2 = new Boids(6);
        this.objects.cel.cube.push(boids, boids2);
        this.allObjects.push(boids, boids2);
    }
  },

  addBlur: function(blur) {
    this.blurs.push(blur);
    if(this.blurs.length > 80) {
      this.blurs.splice(0,1);
    }
  },

  powerOf2: function(size) {
    var i = 256;
    while(i < size && i < 2000) {
      i *= 2;
    }
    return i;
  },

  resize: function() {
    this.canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    this.canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  },

  initTexture: function(id) {
    this.textures[id] = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[id]);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.textureImgs[id]);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  },

  initShader: function(id) {
    var fragmentShader = getShader(this.gl, id+"Fragment", this.gl.FRAGMENT_SHADER);
    var vertexShader = getShader(this.gl, id+"Vertex", this.gl.VERTEX_SHADER);
    
    this.programs[id] = {
      program: this.gl.createProgram(),
      attributes: {}
    }
    this.gl.attachShader(this.programs[id].program, vertexShader);
    this.gl.attachShader(this.programs[id].program, fragmentShader);
    this.gl.linkProgram(this.programs[id].program);
        
    if (!this.gl.getProgramParameter(this.programs[id].program, this.gl.LINK_STATUS)) {
      console.log("Unable to initialize the shader program.");
    }

    this.programs[id].attributes["aVertexPosition"] = this.gl.getAttribLocation(this.programs[id].program, "aVertexPosition");
    this.gl.enableVertexAttribArray(this.programs[id].attributes["aVertexPosition"]);

    this.programs[id].attributes["aVertexNormal"] = this.gl.getAttribLocation(this.programs[id].program, "aVertexNormal");
    this.gl.enableVertexAttribArray(this.programs[id].attributes["aVertexNormal"]);
  },

  initBuffer: function(id) {
    this.buffers[id] = {
      vertex: this.gl.createBuffer(),
      index: this.gl.createBuffer(),
      normal: this.gl.createBuffer()
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[id].vertex);    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(_vcMeshes[id].vertices), this.gl.STATIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[id].normal);    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(_vcMeshes[id].normals), this.gl.STATIC_DRAW);
    
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers[id].index);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_vcMeshes[id].indices), this.gl.STATIC_DRAW);
  },

  updateScene: function() {
    var currentTime = (new Date).getTime();
    var delta;
    if (this.lastTime) {
      delta = currentTime - this.lastTime;
    }
    this.lastTime = currentTime;

    if(delta) {
      for(var i = 0; i < this.allObjects.length; i++) {
        this.allObjects[i].update(delta);
      }
      for(var i = 0; i < this.blurs.length; i++) {
        this.blurs[i].update(delta);
      }
    }
  },

  drawScene: function() {
    this.updateScene();

    //DRAW MAIN SCENE
    this.gl.clearColor(1.0, 0.9, 0.71, 1.0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.size, this.size);
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    var perspectiveMatrix = glUtils.makePerspective(45, window.innerWidth / window.innerHeight, 0.1, 100.0);
    var x = (this.mouseX / window.innerWidth) - 0.5;
    var y = (this.mouseY / window.innerHeight) - 0.5;
    var viewMatrix = glUtils.makeLookAt(-x/3, y/3, 0, 0, 0, -1, 0, 1, 0);

    for(var programId in this.objects) {
      var program = this.programs[programId].program;
      this.gl.useProgram(program);

      var pUniform = this.gl.getUniformLocation(program, "uPMatrix");
      this.gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));
      var vUniform = this.gl.getUniformLocation(program, "uVMatrix");
      this.gl.uniformMatrix4fv(vUniform, false, new Float32Array(viewMatrix.flatten()));
      var u = this.gl.getUniformLocation(program, "uLightPos");
      this.gl.uniform3f(u, 3.0, 6.0, -3.0);

      for(var bufferId in this.objects[programId]) {
        var buffer = this.buffers[bufferId];

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.vertex);
        this.gl.vertexAttribPointer(this.programs[programId].attributes["aVertexPosition"], 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.normal);
        this.gl.vertexAttribPointer(this.programs[programId].attributes["aVertexNormal"], 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.index);

        var objects = this.objects[programId][bufferId];
        for(var i = 0; i < objects.length; i++) {
          var self = this;
          objects[i].draw(this.gl, program, "uMMatrix", programId, bufferId, function() {
            self.gl.drawElements(self.gl.TRIANGLES, _vcMeshes[bufferId].indices.length, self.gl.UNSIGNED_SHORT, 0);
          });
        }
      }
    }



    //DRAW BLURS
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.blurFramebuffer);
    this.gl.viewport(0, 0, this.size, this.size);
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    var program = this.programs["blur"].program;
    this.gl.useProgram(program);
    var pUniform = this.gl.getUniformLocation(program, "uPMatrix");
    this.gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));
    var vUniform = this.gl.getUniformLocation(program, "uVMatrix");
    this.gl.uniformMatrix4fv(vUniform, false, new Float32Array(viewMatrix.flatten()));
    var buffer = this.buffers["face"];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.vertex);
    this.gl.vertexAttribPointer(this.programs["blur"].attributes["aVertexPosition"], 3, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.normal);
    this.gl.vertexAttribPointer(this.programs["blur"].attributes["aVertexNormal"], 3, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.index);

    for(var i = 0; i < this.blurs.length; i++) {
      this.blurs[i].draw(this.gl, program, "uMMatrix", programId, bufferId, function() {
        self.gl.drawElements(self.gl.TRIANGLES, _vcMeshes[bufferId].indices.length, self.gl.UNSIGNED_SHORT, 0);
      });
    };
    this.gl.enable(this.gl.DEPTH_TEST);



    //POST PROCESSING
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.useProgram(this.programs["post"].program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.screenVertexBuffer);
    this.gl.vertexAttribPointer(this.programs["post"].attributes["aVertexPosition"], 2, this.gl.FLOAT, false, 0, 0);

    var wLocation = this.gl.getUniformLocation(this.programs["post"].program, 'w');
    this.gl.uniform1f(wLocation, this.canvas.width);

    var hLocation = this.gl.getUniformLocation(this.programs["post"].program, 'h');
    this.gl.uniform1f(hLocation, this.canvas.height);

    this.gl.uniform1i(this.gl.getUniformLocation(this.programs["post"].program, "tex0"), 0);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebufferTexture);

    this.gl.uniform1i(this.gl.getUniformLocation(this.programs["post"].program, "tex1"), 1);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurFramebufferTexture);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  },

  declined: function() {
    for(var i = 0; i < this.allObjects.length; i++) {
      this.allObjects[i].declined();
    }
  },

  accepted: function() {
    for(var i = 0; i < this.allObjects.length; i++) {
      this.allObjects[i].accepted();
    }
  }
};



function MatrixStack() {
  this.m = Matrix.I(4);
  this.s = [this.m];
}

MatrixStack.prototype = {
  mult: function(m) {
    this.m = this.m.x(m);
  },
  
  translate: function(v) {
    this.mult(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
  },

  scale: function(v) {
    this.mult(Matrix.Diagonal([v[0], v[1], v[2], 1.0]).ensure4x4());
  },

  setUniform: function(gl, program, uniform) {
    var u = gl.getUniformLocation(program, uniform);
    gl.uniformMatrix4fv(u, false, new Float32Array(this.m.flatten()));
  },

  push: function(m) {
    if (m) {
      this.s.push(m.dup());
      this.m = m.dup();
    } else {
      this.m = this.m.dup();
      this.s.push(this.m);
    }
  },

  pop: function() {
    if (!this.s.length) {
      throw("Can't pop from an empty matrix stack.");
    }
    
    var m = this.s.pop();
    this.m = this.s[this.s.length - 1];
    return m;
  },

  rotate: function(angle, v) {
    var inRadians = angle * Math.PI / 180.0;
    
    var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
    this.mult(m);
  }
};



function Mug(dx, scene, coffee) {
  this.origdx = dx;
  this.scene = scene;
  this.coffee = coffee;
  this.reset();
}

Mug.prototype = {
  reset: function() {
    this.x = 6 * -this.origdx;
    this.dx = this.origdx;
    this.y = 0.5 + 0.5*Math.random();
    this.dy = 0;
    this.rot = Math.random() * 6;
    this.drot = Math.random() + 1;
    this.gravity = true; // falling onto table
    this.friction = false;
    this.falling = false; // falling off table
    this.done = false;
    this.rotZ = 0;
    this.drotZ = 0;

    this.timer = 1000;

    this.coffee.rotTime = 0;
    this.coffee.rotAmount = this.dx;
    this.coffee.rotTargetAmount = this.dx;
    this.coffee.rotTargetSpeed = this.dx *2;
    this.coffee.rotSpeed = this.dx *2;
    this.coffee.rotExtra = 0;
  },

  update: function(dt) {
    this.x += this.dx * dt / 350;
    if(this.gravity || this.falling && Math.abs(this.x)>4) {
      this.dy += dt / 500;
      this.y -= this.dy * dt / 300;
    }
    if(this.falling && Math.abs(this.x)>3) {
        this.drotZ += dt / 100;
        this.rotZ += this.drotZ * -this.dx * dt / 50;
        this.coffee.rotExtra = this.rotZ;
    }
    this.rot += this.dx * this.drot * dt / 5;
    if(this.gravity && this.y < -1.10 && this.dy > 0) {
      this.y = -1.10;
      if(this.dy > 0.02) {
        this.dy = - this.dy * 0.5;
      } else {
        this.gravity = false;
      }
    }
    if(this.x*this.dx > -Math.abs(this.dx) * 0.6 && !this.friction) {
      this.dx = -this.dx;
      this.coffee.rotSpeed = - this.coffee.rotSpeed;
      this.friction = true;
      this.drot = -1;
    }
    if(this.friction) {
      if(this.dx > 0.05) {
        this.dx -= dt / 1000;
      } else if (this.dx < -0.05) {
        this.dx += dt / 1000;
      } else {
        this.dx = 0;
        this.done = true;
      }
    }
    this.timer -= dt;
    if(this.timer < 0) {
      this.timer = 100 + Math.random() * 100;
      this.scene.addBlur(new Blur(this.x, this.y + 0.4));
    }
    this.coffee.x = this.x;
    this.coffee.y = this.y;
    this.coffee.z = -6.0;
    this.coffee.rotTargetAmount = this.dx;
    this.coffee.rotTargetSpeed = this.dx * 2;
  },

  draw: function(gl, program, modelMatrixUniform, programId, bufferId, drawCallback) {
    var modelMatrix = new MatrixStack();
    modelMatrix.translate([this.x, this.y, -6.0]);
    modelMatrix.push();
    modelMatrix.rotate(this.rotZ, [0, 0, 1]);
    modelMatrix.push()
    modelMatrix.rotate(this.rot, [0, 1, 0]);
    modelMatrix.setUniform(gl, program, modelMatrixUniform);
    modelMatrix.pop();
    modelMatrix.pop();

    var u = gl.getUniformLocation(program, "UaColor");
    gl.uniform3f(u, 0.3, 0.3, 0.3);
    u = gl.getUniformLocation(program, "UdColor");
    gl.uniform3f(u, 0.9, 0.8, 0.7);
    u = gl.getUniformLocation(program, "UsColor");
    gl.uniform3f(u, 1.0, 0.95, 0.9);
    u = gl.getUniformLocation(program, "Ushine");
    gl.uniform1f(u, 110.0);

    if(programId == "cel") {
      drawCallback();
    } else if(programId == "border") {
      var u = gl.getUniformLocation(program, "uBorderThickness");
      gl.uniform1f(u, 0.015);
      drawCallback();
    }
  },

  accepted: function() {
    if(!this.done)
      return;
    this.friction = false;
    this.dx = this.origdx;
    this.coffee.rotAmount = this.dx;
    this.coffee.rotSpeed = this.dx * 2;
    this.done = false;
  },

  declined: function() {
    if(!this.done)
      return;
    this.dx = -1.5*this.origdx;
    this.coffee.rotAmount = this.origdx * -1;
    this.coffee.rotSpeed = this.dx * 2;
    this.falling = true;
    this.gravity = false;
    this.done = false;
    var obj = this;
    setTimeout(function() {
      obj.reset();
    }, 2000);
  }
}




function Coffee() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rotTime = 0;
    this.rotAmount = 1;
    this.rotTargetAmount = 1;
    this.rotTargetSpeed = 1;
    this.rotSpeed = 1;
    this.rotExtra = 0;
}

Coffee.prototype = {
  update: function(dt) {
    this.rotAmount += (this.rotTargetAmount - this.rotAmount) / 2000 * dt;
    this.rotSpeed += (this.rotTargetSpeed - this.rotSpeed) / 2000 * dt;
    this.rotTime += dt * this.rotSpeed / 250;
  },

  draw: function(gl, program, modelMatrixUniform, programId, bufferId, drawCallback) {
    var modelMatrix = new MatrixStack();
    modelMatrix.translate([this.x, this.y, this.z]);
    modelMatrix.push();
    modelMatrix.rotate(this.rotExtra, [0,0,1]);
    modelMatrix.translate([0, 0.36, 0]);
    modelMatrix.rotate(6*this.rotAmount*Math.sin(this.rotTime), [0,0,1]);
    modelMatrix.scale([0.55,0.55,0.55]);
    modelMatrix.setUniform(gl, program, modelMatrixUniform);
    modelMatrix.pop();

    var u = gl.getUniformLocation(program, "UaColor");
    gl.uniform3f(u, 0.4, 0.35, 0.2);
    u = gl.getUniformLocation(program, "UdColor");
    gl.uniform3f(u, 0.5, 0.4, 0.3);
    u = gl.getUniformLocation(program, "UsColor");
    gl.uniform3f(u, 0.9, 0.9, 0.9);
    u = gl.getUniformLocation(program, "Ushine");
    gl.uniform1f(u, 4.0);

    drawCallback();
  },

  declined: function() {},
  accepted: function() {}
}




function Table() {

}

Table.prototype = {
  update: function(dt) {
  },

  draw: function(gl, program, modelMatrixUniform, programId, bufferId, drawCallback) {
    var modelMatrix = new MatrixStack();
    modelMatrix.translate([0.0, -2.5, -6.0]);
    modelMatrix.push();
    modelMatrix.scale([4.0,1.0,2.0]);
    modelMatrix.setUniform(gl, program, modelMatrixUniform);
    modelMatrix.pop();

    var u = gl.getUniformLocation(program, "UaColor");
    gl.uniform3f(u, 0.2, 0.15, 0.1);
    u = gl.getUniformLocation(program, "UdColor");
    gl.uniform3f(u, 0.5, 0.4, 0.3);
    u = gl.getUniformLocation(program, "UsColor");
    gl.uniform3f(u, 0.9, 0.9, 0.9);
    u = gl.getUniformLocation(program, "Ushine");
    gl.uniform1f(u, 4.0);

    drawCallback();
  },

  declined: function() {},
  accepted: function() {}
}





function Picture(tex, x, y) {
  this.tex = tex;
  this.x = x;
  this.y = y;
  this.rot = -x * 6;
}

Picture.prototype = {
  update: function(dt) {
  },

  draw: function(gl, program, modelMatrixUniform, programId, bufferId, drawCallback) {
    var modelMatrix = new MatrixStack();
    modelMatrix.translate([this.x, this.y, -17.0]);
    modelMatrix.push();
    modelMatrix.rotate(this.rot, [0, 1, 0])
    modelMatrix.scale([2.2,2.2,1.0]);
    modelMatrix.setUniform(gl, program, modelMatrixUniform);
    modelMatrix.pop();

    gl.uniform1i(gl.getUniformLocation(program, "tex"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);

    drawCallback();
  },

  declined: function() {},
  accepted: function() {}
}




function Blur(x, y) {
  this.x = x + Math.random() - 0.5;
  this.origX = this.x;
  this.dx = Math.random() * 0.18;
  this.z = -6.5 + Math.random();
  this.w = Math.random() * 0.15 + 0.15;
  this.h = Math.random() * 0.3 + 0.3;
  this.y = y + this.h/2;
  this.s = Math.random() + 0.5;
  this.rotAxis = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
  this.rot = Math.random() * 6.0;
  this.time = 0;
}

Blur.prototype = {
  update: function(dt) {
    this.y += this.s * dt / 2000;
    this.x = this.origX + this.dx * Math.sin(this.y * this.s);
    this.time += dt;
  },

  draw: function(gl, program, modelMatrixUniform, programId, bufferId, drawCallback) {
    var modelMatrix = new MatrixStack();
    modelMatrix.translate([this.x, this.y, this.z]);
    modelMatrix.push();
    modelMatrix.scale([this.w,this.h,1.0]);
    modelMatrix.rotate(this.rot, this.rotAxis);
    modelMatrix.setUniform(gl, program, modelMatrixUniform);
    modelMatrix.pop();

    var u = gl.getUniformLocation(program, "uLife");
    gl.uniform1f(u, this.time > 3000.0 ? Math.max(0.0, (4000.0 - this.time)/1000.0) : Math.min(1.0, this.time / 1000.0));

    drawCallback();
  },

  declined: function() {},
  accepted: function() {}
}




function Boids(centerX) {
    this.center = {x: centerX, y: 1, z: -14};

    this.leaderTimer = 1000;

    this.objs = [];
    this.objTimer = 1000;

    for(var i = 0; i < 10; i++) {
        this.objs.push({
            pos: {x: Math.random() * 3 - 1.5 + centerX, y: Math.random() * 3 - 1, z: -14 + Math.random() * 3},
            vel: {x: 0, y: 0, z: 0},
            targetVel: {x: 0, y: 0, z: 0},
            rot: Math.random() * 60 - 30,
            rotVector: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5],
            rotSpeed: Math.random() - 0.5
        });
    }

    this.leader = this.objs[0];
}

Boids.prototype = {

  update: function(dt) {

    this.leaderTimer -= dt * 2;
    if(this.leaderTimer < 0) {
        this.leaderTimer = 2000 + 1000 * Math.random();
        if(Math.random() < 0.05) {
            this.leader = this.objs[Math.floor(Math.random()*this.objs.length)];
        }

        var d = this.normalize({
            x: this.center.x + Math.random() - 0.5 - this.leader.pos.x,
            y: this.center.y + Math.random() - 0.5 - this.leader.pos.y,
            z: this.center.z + Math.random() - 0.5 - this.leader.pos.z}, Math.random() + 0.5);

        this.leader.targetVel.x = d.x * (Math.random() - 0.1) * 1.5;
        this.leader.targetVel.y = d.y * (Math.random() - 0.1) * 1.5;
        this.leader.targetVel.z = d.z * (Math.random() - 0.1) * 0.5;
    }

    for(var i = 0; i < this.objs.length; i++) {
        var obj = this.objs[i];
        obj.vel.x += (obj.targetVel.x - obj.vel.x)/300*dt;
        obj.vel.y += (obj.targetVel.y - obj.vel.y)/300*dt;
        obj.vel.z += (obj.targetVel.z - obj.vel.z)/300*dt;
        obj.pos.x += obj.vel.x * dt / 1000;
        obj.pos.y += obj.vel.y * dt / 1000;
        obj.pos.z += obj.vel.z * dt / 1000;
        //obj.rot += obj.rotSpeed * dt / 20;
    }

    this.objTimer -= dt;
    if(this.objTimer < 0) {
        this.objTimer = 300 + 300 * Math.random();

        var avg = {x: 0, y: 0, z: 0};
        for(var i = 0; i < this.objs.length; i++) {
            var obj = this.objs[i];
            avg.x += obj.pos.x;
            avg.y += obj.pos.y;
            avg.z += obj.pos.z;
        }
        avg.x /= this.objs.length;
        avg.y /= this.objs.length;
        avg.z /= this.objs.length;

        for(var i = 0; i < this.objs.length; i++) {
            var obj = this.objs[i];
            if(obj === this.leader) continue;
            var d1 = this.normalize({
                x: this.leader.pos.x - obj.pos.x,
                y: this.leader.pos.y - obj.pos.y,
                z: this.leader.pos.z - obj.pos.z}, Math.random() + 0.5);
            var d2 = this.normalize({
                x: avg.x - obj.pos.x,
                y: avg.y - obj.pos.y,
                z: avg.z - obj.pos.z}, Math.random() + 0.5);
            obj.targetVel.x = 0;
            obj.targetVel.y = 0;
            obj.targetVel.z = 0;
            for(var j = 0; j < this.objs.length; j++) {
                if(i==j) continue;
                var other = this.objs[j];
                var d3 = this.normalize({
                    x: (obj.pos.x - other.pos.x),
                    y: (obj.pos.y - other.pos.y),
                    z: (obj.pos.z - other.pos.z)*0.5
                }, Math.random() + 0.5);
                obj.targetVel.x += d3.x/(d3.d+1);
                obj.targetVel.y += d3.y/(d3.d+1);
                obj.targetVel.z += d3.z/(d3.d+1);
            }
            obj.targetVel.x /= this.objs.length;
            obj.targetVel.y /= this.objs.length;
            obj.targetVel.z /= this.objs.length;
            obj.targetVel.x = (obj.targetVel.x * 7 + d1.x * 2 + d2.x) / 2;
            obj.targetVel.y = (obj.targetVel.y * 7 + d1.y * 2 + d2.y) / 2;
            obj.targetVel.z = (obj.targetVel.z * 7 + d1.z * 2 + d2.z) / 2;

        }
    }
  },

  draw: function(gl, program, modelMatrixUniform, programId, bufferId, drawCallback) {
    var u = gl.getUniformLocation(program, "UaColor");
    gl.uniform3f(u, 0.1, 0.15, 0.2);
    u = gl.getUniformLocation(program, "UdColor");
    gl.uniform3f(u, 0.7, 0.8, 0.9);
    u = gl.getUniformLocation(program, "UsColor");
    gl.uniform3f(u, 0.9, 0.9, 0.9);
    u = gl.getUniformLocation(program, "Ushine");
    gl.uniform1f(u, 4.0);

    for(var i = 0; i < this.objs.length; i++) {
        var obj = this.objs[i];
        var modelMatrix = new MatrixStack();
        modelMatrix.translate([obj.pos.x, obj.pos.y, obj.pos.z]);
        modelMatrix.push();
        modelMatrix.scale([0.07+Math.abs(obj.vel.x/7), 0.07+Math.abs(obj.vel.y/7), 0.03+Math.abs(obj.vel.z/14)]);
        modelMatrix.push();
        modelMatrix.rotate(obj.rot, obj.rotVector);
        modelMatrix.setUniform(gl, program, modelMatrixUniform);
        modelMatrix.pop();
        modelMatrix.pop();
        drawCallback();
    }
  },

  normalize: function(vel, multiplier) {
    var d = multiplier * Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    return {x: vel.x/d, y: vel.y/d, z: vel.z/d, d: d};
  },

  declined: function() {},
  accepted: function() {}
}







})(window);