class Pendul {
    loadConfigUrl() {
        let params = {};
        let toLoad=['phi1', 'phi2', 'm1', 'm2', 'l1', 'l2', 'tc', 'tw', 'tl', 't', 'rc', 'dt', 'dl', 'lc']
        let parser = document.createElement('a');
        parser.href = window.location.href;
        let query = parser.search.substring(1);
        let vars = query.split('&');
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split('=');
            params[pair[0]] = decodeURIComponent(pair[1]);
        }
        toLoad.forEach(param=>{
            if(param in params) {
                if(params[param]=="true" || params[param]=="false") {
                    this[param] = String(params[param]) == "true";
                } else {
                    this[param] = param=='tc'||param=='lc'?"#"+params[param]:params[param];
                }
            }
        });
    }
    getConfigUrl() {
        let toLoad=['m1', 'm2', 'l1', 'l2', 'tc', 'tw', 'tl', 't', 'rc', 'dt', 'dl', 'lc']
        let host = window.location.host;
        let path = '/?'
        toLoad.forEach((param, index)=>{
            if(index>0) path+='&'
            if(param == "tc" || param == "lc") {
                path+= `${param}=${this[param].replace('#','')}`;
            } else if(param.includes('phi')) {
                path+= `${param}=${Math.round(this[param]*2/(Math.PI))}`;
            } else {
                path+= `${param}=${this[param]}`;
            }
        });
        return {
            url:host+path,
            host,
            path
        }
    }

    RGB2Color(r,g,b) {
        return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    }
    HEX2RGB(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : null;
    }
    HSL2RGB(h, s, l){
        var r, g, b;
        if(s == 0){
            r = g = b = l; // achromatic
        }else{
            var hue2rgb = function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }
    
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
    
        return [
            Math.round(r * 255), 
            Math.round(g * 255), 
            Math.round(b * 255)
        ];
    }

    COLOR2RGB(color) {
        if(color.includes('hsl')) {
            return this.HSL2RGB(color);
        } else if(color.includes('#')) {
            return this.HEX2RGB(color);
        } else if(color.includes('rgb') && !color.includes('rgba')) {
            return color.replace(/rgb\(|\)/g, '').split(',')
        } else {
            return('rgb(248, 168, 248)')
        }
    }

    constructor(name, height, width) {
        this.name = name;
        this.w = width;
        this.h = height;
        // Valeurs globales
        this.d2Phi1 = 0;
        this.d2Phi2 = 0;
        this.dPhi1 = 0;
        this.dPhi2 = 0;

        // Valeurs modifiables
        this.phi1 = 1*(Math.PI)/2; // Angle de départ du levier 1 par rapport au sol
        this.phi2 = 2.3*(Math.PI)/2; // Angle de départ du levier 2 par rapport au sol
        this.m1 = 10; // Masse du poid 1
        this.m2 = 10; // Masse du poid 2
        this.l1 = 250; // Longueur levier 1
        this.l2 = 100; // Longueur levier 2
        if (this.l1+this.l2>this.h/2 || this.l1+this.l2>this.w/2) {
            this.l1 = ((this.w<this.h)?this.w:this.h)/4;
            this.l2 = ((this.w<this.h)?this.w:this.h)/6;
        }
        this.dt = true; //draw trail
        this.dl = false; //draw lever
        this.tc='#F8A8F8'; // trail color
        this.lc='#99CC99'; // lever color
        this.tw=7.6; // trail width
        this.tl=100; // trail length
        this.rc=false; // rainbow trail color
        this.t = 0.05;

        // trail
        this.trail = []

        // Coordonnées du haut du levier
        this.X0 = this.w/2; 
        this.Y0 = this.h/2;

        // Constante
        this.g = 9.8;
        this.rainbowParams = {
            center: 128,
            width: 127,
            frequency: (Math.PI)*2/1000,
            phase: 0,
            i:0
        }

        this.loadConfigUrl();

    }

    get tcRGB() {
        return this.COLOR2RGB(this.tc);
    }

    get actPos() {
        return this._circle2 || {
            x: this.X0+this.l1*Math.sin(this.phi1)+this.l2*Math.sin(this.phi2),
            y: this.Y0+this.l1*Math.cos(this.phi1)+this.l2*Math.cos(this.phi2),
            mass: this.m2
        }
    }

    init(elParent) {
        $(elParent).append(`
            <div class="pendul-bloc" id="${this.name}-bloc">
                <canvas id="${this.name}-trail" class="pendul-canvas-trail" width="${this.w}" height="${this.h}" ${this.dt?'':'style="display:none;"'}></canvas>
                <canvas id="${this.name}"  class="pendul-canvas" width="${this.w}" height="${this.h}" ${this.dl?'':'style="opacity:0;"'}></canvas>
                <div class="pendul-toggle-control"></div>
                <div class="pendul-control" id="${this.name}-control" style="display:none;">
                    <section>
                        <h3>Poid 1</h3>
                        <label for="m1">Masse</label>
                        <input id="m1" class="pendul-input-m" type="range" min="1" max="51" value="${this.m1}" step="5">
                        <label for="l1">Longueur du levier</label>
                        <input id="l1" class="pendul-input-l" type="range" min="1" max="201" value="${this.l1}" step="20">
                        <label for="phi1">Angle de départ</label>
                        <input id="phi1" class="pendul-input-phi" type="range" min="0" max="90" value="${this.phi1/(Math.PI)*180}">
                    </section>
                    <section>
                        <h3>Poid 2</h3>
                        <label for="m2">Masse</label>
                        <input id="m2" class="pendul-input-m" type="range" min="1" max="51" value="${this.m2}" step="5">
                        <label for="l2">Longueur du levier</label>
                        <input id="l2" class="pendul-input-l" type="range" min="1" max="201" value="${this.l2}" step="20">
                        <label for="phi2">Angle de départ</label>
                        <input id="phi2" class="pendul-input-phi" type="range" min="0" max="180" value="${this.phi2/(Math.PI)*180}">
                    </section>
                    <section>
                        <h3>Général</h3>
                        <label for="t">Vitesse de simulation</label>
                        <input id="t" class="pendul-input-t" type="range" min="0" max="12" value="${this.t*100}" step="2">
                        <label for="tw">Largeur de la trainée</label>
                        <input id="tw" class="pendul-input-tw" type="range" min="10" max="1010" value="${this.tw*100}" step="50">
                        <label for="tl">Longueur de la trainée</label>
                        <input id="tl" class="pendul-input-tl" type="range" min="10" max="510" value="${this.tl}" step="10">
                        <label for="lc">Couleur du levier</label>
                        <input id="lc" class="pendul-input-lc" type="color" value="${this.lc}">
                        <label for="tc">Couleur de la trainée</label>
                        <input id="tc" class="pendul-input-tc" type="color" value="${this.tc}" ${this.rc?'style="display:none;"':''}>
                        
                    </section>
                    <section>
                        <h3>Plus</h3>
                        <button class="shareBtn">Partager</button>
                        <button class="disableTrail" ${this.dt?'':'style="display:none;"'}>Enlever la trainée</button>
                        <button class="enableTrail" ${this.dt?'style="display:none;"':''}>Ajouter la trainée</button>
                        <button class="disableLever" ${this.dl?'':'style="display:none;"'}>Cacher le levier</button>
                        <button class="enableLever" ${this.dl?'style="display:none;"':''}>Afficher le levier</button>
                        <button class="enableRainbowColor" ${this.rc?'style="display:none;"':''}>Couleur normale</button>
                        <button class="disableRainbowColor" ${this.rc?'':'style="display:none;"'}>Couleurs arc-en-ciel</button>
                        <a href="/" class="button reset">Réinitialiser</a>
                    </section>
                    <div id="credit">Développé par <a href="https://arthaud.dev">Arthaud Proust</a> &copy2021</div>
                </div>
                <div class="pendul-sharePopup" style="display:none">
                    <h2>Voici votre lien</h2>
                    <span>Partagez votre configuration, à l'identique.</span>
                    <kbd class="pendul-sharePopup-link"></kbd>
                    <button class="pendul-sharePopup-close">Fermer</a>
                </div>
            </div>
        `);

        $('#pendul-control').on('click', ()=> {
            window.history.replaceState('Modification', 'Pendulum', this.getConfigUrl().path);
        })

        $(`#${this.name}-control .pendul-input-phi`).on('change', (e)=>{
            clearInterval(this.runAnim);
            this[$(e.target).attr("id")] = $(e.target).val()/180*(Math.PI);
            this.run()
        });
        $(`#${this.name}-control .pendul-input-t, #${this.name}-control .pendul-input-tw`).on('change', (e)=>{
            this[$(e.target).attr("id")] = $(e.target).val()/100;
        });
        $(`#${this.name}-control .pendul-input-tl`).on('change', (e)=>{
            this[$(e.target).attr("id")] = $(e.target).val();
        });
        $(`#${this.name}-control .pendul-input-l`).on('change', (e)=>{
            this[$(e.target).attr("id")] = $(e.target).val();
        });
        $(`#${this.name}-control .pendul-input-m`).on('change', (e)=>{
            this[$(e.target).attr("id")] = $(e.target).val();
            this.run()
        })

        $(`#${this.name}-control .pendul-input-tc, #${this.name}-control .pendul-input-lc`).change((e)=>{
            if(/^#[0-9A-F]{6}$/i.test($(e.target).val())) {
                this[$(e.target).attr("id")] = $(e.target).val();
            }
        });
        $(`#${this.name}-control .pendul-input-tc, #${this.name}-control .pendul-input-lc`).keyup((e)=>{
            if(/^#[0-9A-F]{6}$/i.test($(e.target).val())) {
                this[$(e.target).attr("id")] = $(e.target).val();
            }
        });
        $('.shareBtn').click((e)=>{
            $(e.target).closest('.pendul-bloc').find('.pendul-sharePopup').fadeIn();
            $(e.target).closest('.pendul-bloc').find('.pendul-sharePopup-link').text(this.getConfigUrl().url);
        })
        $('.pendul-sharePopup-close').click((e)=>{
            $(e.target).closest('.pendul-sharePopup').fadeOut();
        });
        $('.disableTrail').click((e)=>{
            this.dt = false;
            $(e.target).closest('.pendul-bloc').find('.pendul-canvas-trail').fadeOut();
            $(e.target).fadeOut(()=>{
                $(e.target).next('.enableTrail').fadeIn();
            });
        })
        $('.enableTrail').click((e)=>{
            this.dt = true;
            $(e.target).closest('.pendul-bloc').find('.pendul-canvas-trail').fadeIn();
            $(e.target).fadeOut(()=>{
                $(e.target).prev('.disableTrail').fadeIn();
            });
            
        })
        $('.disableLever').click((e)=>{
            this.dl = false;
            $(e.target).closest('.pendul-bloc').find('.pendul-canvas').animate({
                opacity:0
            }, 500);
            $(e.target).fadeOut(()=>{
                $(e.target).next('.enableLever').fadeIn();
            });
        })
        $('.enableLever').click((e)=>{
            this.dl = true;
            $(e.target).closest('.pendul-bloc').find('.pendul-canvas').animate({
                opacity:1
            }, 500);
            $(e.target).fadeOut(()=>{
                $(e.target).prev('.disableLever').fadeIn();
            });
        })
        $('.disableRainbowColor').click((e)=>{
            this.rc = false;
            $(e.target).fadeOut(()=>{
                $(e.target).prev('.enableRainbowColor').fadeIn();
            });
            $(e.target).closest('.pendul-bloc').find('#tc').fadeIn();
        })
        $('.enableRainbowColor').click((e)=>{
            this.rc = true;
            $(e.target).fadeOut(()=>{
                $(e.target).next('.disableRainbowColor').fadeIn();
            });
            $(e.target).closest('.pendul-bloc').find('#tc').fadeOut();
            
        })
        $('.pendul-toggle-control').click((e)=>{
            if($(e.target).closest('.pendul-bloc').find('.pendul-control').is(':visible')) {
                $("html, body").animate({ scrollTop: 0 }, 500);
                $(e.target).closest('.pendul-bloc').find('.pendul-control').fadeOut(500);
                $(e.target).css("background", "url('/assets/sliders.svg') no-repeat");
            } else {
                $(e.target).closest('.pendul-bloc').find('.pendul-control').fadeIn(1000);
                $("html, body").animate({ scrollTop: $(window).height() }, 1000);
                $(e.target).css("background", "url('/assets/close.svg') no-repeat");
                
            }
        })

        this.cvs = $('#'+this.name);
        this.cvsTrail = $('#'+this.name+'-trail');
    }

    run() {
        let lever1 = {
            x0: this.X0, 
            y0: this.Y0, 
            x: 0, 
            y: 0
        };
        let lever2 = {
            x0: 0, 
            y0: 0, 
            x: 0, 
            y: 0
        };
        let circle1 = {
            x: this.X0+this.l1*Math.sin(this.phi1),
            y: this.Y0+this.l1*Math.cos(this.phi1),
            mass: this.m1
        };
        let circle2 = {
            x: this.X0+this.l1*Math.sin(this.phi1)+this.l2*Math.sin(this.phi2),
            y: this.Y0+this.l1*Math.cos(this.phi1)+this.l2*Math.cos(this.phi2),
            mass: this.m2
        };

        this.cvs.clearCanvas();
        this.cvsTrail.clearCanvas();

        clearInterval(this.runAnim);
        this.runAnim = setInterval(()=>{
            this.animate(circle1, circle2, lever1, lever2);
        }, 1);
    }

    animate(circle1, circle2, lever1, lever2) {
        let mu = 1+this.m1/this.m2;
        this.d2Phi1  =  (this.g*(Math.sin(this.phi2)*Math.cos(this.phi1-this.phi2)-mu*Math.sin(this.phi1))-(this.l2*this.dPhi2*this.dPhi2+this.l1*this.dPhi1*this.dPhi1*Math.cos(this.phi1-this.phi2))*Math.sin(this.phi1-this.phi2))/(this.l1*(mu-Math.cos(this.phi1-this.phi2)*Math.cos(this.phi1-this.phi2)));
        this.d2Phi2  =  (mu*this.g*(Math.sin(this.phi1)*Math.cos(this.phi1-this.phi2)-Math.sin(this.phi2))+(mu*this.l1*this.dPhi1*this.dPhi1+this.l2*this.dPhi2*this.dPhi2*Math.cos(this.phi1-this.phi2))*Math.sin(this.phi1-this.phi2))/(this.l2*(mu-Math.cos(this.phi1-this.phi2)*Math.cos(this.phi1-this.phi2)));
        this.dPhi1 += this.d2Phi1*this.t;
        this.dPhi2 += this.d2Phi2*this.t;
        this.phi1 += this.dPhi1*this.t;
        this.phi2 += this.dPhi2*this.t;
      
        circle1.x = this.X0+this.l1*Math.sin(this.phi1);
        circle1.y = this.Y0+this.l1*Math.cos(this.phi1);
        circle2.x = this.X0+this.l1*Math.sin(this.phi1)+this.l2*Math.sin(this.phi2);
        circle2.y = this.Y0+this.l1*Math.cos(this.phi1)+this.l2*Math.cos(this.phi2);
        
        this._circle2 = circle2;


        lever1.x  = circle1.x;
        lever1.y  = circle1.y;
        lever2.x0 = circle1.x;
        lever2.y0 = circle1.y;
        lever2.x  = circle2.x;
        lever2.y  = circle2.y;
      
        this.cvs.clearCanvas()

        // point du millieu
        this.cvs.drawArc({
            fillStyle: '#5D5D60',
            x: this.X0, y: this.Y0,
            radius: 7
        });

        this.drawLever(lever1);
        this.drawLever(lever2);
        this.drawCircle(circle1);
        this.drawCircle(circle2);

        this.drawTrail();
    }

    getTrailStepColor(i) {
        if(this.rc) {
            let { center, width, frequency, phase } = this.rainbowParams;
            let red = Math.sin(frequency*i+2+phase) * width + center;
            let green = Math.sin(frequency*i+0+phase) * width + center;
            let blue = Math.sin(frequency*i+4+phase) * width + center;

            return [red,green,blue]
        } else {
            return this.tcRGB
        }
    }

    getAlphaColor(indexOfTrail, i) {
        let [r, g, b] = this.getTrailStepColor(i);
        let alpha = indexOfTrail/this.tl;
        return `rgba(${r},${g},${b},${alpha})`
    }

    drawTrail() {
        if(this.trail.length==this.tl) this.trail.shift();
        if(this.trail.length>this.tl) this.trail = this.trail.splice(0, this.tl-1);
        this.rainbowParams.i++;
        
        this.trail.push([
            this.actPos.x, 
            this.actPos.y,
            this.rainbowParams.i
        ]);

        if(this.dt) {
            /*
            if(this.rc) {
                let { center, width, frequency, phase, i } = this.rainbowParams;
                let red = Math.sin(frequency*i+2+phase) * width + center;
                let green = Math.sin(frequency*i+0+phase) * width + center;
                let blue = Math.sin(frequency*i+4+phase) * width + center;
                // this.cvsTrail.drawArc({
                //     fillStyle: this.RGB2Color(red,green,blue),
                //     x: this.actPos.x, 
                //     y: this.actPos.y, 
                //     radius: this.tw
                // });
                this.rainbowParams.i++;
            } else {
                // this.cvsTrail.drawArc({
                //     fillStyle: this.tc,
                //     x: this.actPos.x, 
                //     y: this.actPos.y, 
                //     radius: this.tw
                // });
                this.trail.push([
                    this.actPos.x, 
                    this.actPos.y
                ]);
            }*/

            this.cvsTrail.clearCanvas()
            for(let i=0; i<this.trail.length; i++) {
                this.cvsTrail.drawArc({
                    fillStyle: this.getAlphaColor(i, this.trail[i][2]),
                    x: this.trail[i][0], 
                    y: this.trail[i][1], 
                    radius: this.tw
                });
            }
        }


        
    }

    drawLever(line) {
        // strokeStyle: '#AADDAA',

        this.cvs.drawLine({
            strokeStyle: this.lc,
            strokeWidth: 4,
            rounded: true, 
            x1: line.x0, y1: line.y0,
            x2: line.x, y2: line.y
        });
    }

    drawCircle(circle) {
        this.cvs.drawArc({
            fillStyle: '#FFF',
            x: circle.x, 
            y: circle.y, 
            radius: circle.mass
        });
    }

    enableLever() {
        console.log('e');
        this.dl = true;
        $(`#${this.name}`).animate({
            opacity:1
        }, 3000);
        $(`.${this.name}-control .enableLever`).fadeOut(()=>{
            $(`.${this.name}-control .enableLever`).prev('.disableLever').fadeIn();
        });
    }
}


const chaotic = new Pendul("pendul", $(document).height(), $(document).width());
chaotic.init("body");
chaotic.run();

if(location.search=="") {
    setTimeout(function() {
        chaotic.enableLever()
    }, 6000)
}