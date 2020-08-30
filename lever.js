class Pendul {
    loadConfigUrl() {
        let params = {};
        let toLoad=['phi1', 'phi2', 'm1', 'm2', 'l1', 'l2', 'tc', 'tw', 't', 'rc', 'dt', 'dl', 'lc']
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
        let toLoad=['m1', 'm2', 'l1', 'l2', 'tc', 'tw', 't', 'rc', 'dt', 'dl', 'lc']
        let url = window.location.host+'/?';
        toLoad.forEach((param, index)=>{
            if(index>0) url+='&'
            if(param == "tc" || param == "lc") {
                url+= `${param}=${this[param].replace('#','')}`;
            } else if(param.includes('phi')) {
                url+= `${param}=${Math.round(this[param]*2/(Math.PI))}`;
            } else {
                url+= `${param}=${this[param]}`;
            }
        });
        return url;
    }

    RGB2Color(r,g,b) {
      return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
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
        this.dl = true; //draw lever
        this.tc="#F8A8F8"; // trail color
        this.lc='#99CC99'; // lever color
        this.tw=0.5; // trail width
        this.rc=false; // rainbow trail color
        this.t = 0.05;


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
                        <label for="lc">Couleur du levier</label>
                        <input id="lc" class="pendul-input-lc" type="color" value="${this.lc}">
                        <label for="tc">Couleur de la trainée</label>
                        <input id="tc" class="pendul-input-tc" type="color" value="${this.tc}" ${this.rc?'style="display:none;"':''}>
                        
                    </section>
                    <section>
                        <h3>Plus</h3>
                        <button class="shareBtn">Partager</a>
                        <button class="disableTrail" ${this.dt?'':'style="display:none;"'}>Enlever la trainée</a>
                        <button class="enableTrail" ${this.dt?'style="display:none;"':''}>Ajouter la trainée</a>
                        <button class="disableLever" ${this.dl?'':'style="display:none;"'}>Cacher le levier</a>
                        <button class="enableLever" ${this.dl?'style="display:none;"':''}>Afficher le levier</a>
                        <button class="enableRainbowColor" ${this.rc?'style="display:none;"':''}>Couleur normale</a>
                        <button class="disableRainbowColor" ${this.rc?'':'style="display:none;"'}>Couleurs arc-en-ciel</a>
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

        $(`#${this.name}-control .pendul-input-phi`).on('change', (e)=>{
            clearInterval(this.runAnim);
            this[$(e.target).attr("id")] = $(e.target).val()/180*(Math.PI);
            this.run()
        });
        $(`#${this.name}-control .pendul-input-t, #${this.name}-control .pendul-input-tw`).on('change', (e)=>{
            this[$(e.target).attr("id")] = $(e.target).val()/100;
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
            $(e.target).closest('.pendul-bloc').find('.pendul-sharePopup-link').text(this.getConfigUrl());
            
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
      
        lever1.x  = circle1.x;
        lever1.y  = circle1.y;
        lever2.x0 = circle1.x;
        lever2.y0 = circle1.y;
        lever2.x  = circle2.x;
        lever2.y  = circle2.y;
      
        this.cvs.clearCanvas()

        this.cvs.drawArc({
            fillStyle: '#5D5D60',
            x: this.X0, y: this.Y0,
            radius: 7
        });
        this.drawLever(lever1);
        this.drawLever(lever2);
        this.drawCircle(circle1);
        this.drawCircle(circle2);
        if(this.dt) {
            if(this.rc) {
                let { center, width, frequency, phase, i } = this.rainbowParams;
                let red = Math.sin(frequency*i+2+phase) * width + center;
                let green = Math.sin(frequency*i+0+phase) * width + center;
                let blue = Math.sin(frequency*i+4+phase) * width + center;
                this.cvsTrail.drawArc({
                    fillStyle: this.RGB2Color(red,green,blue),
                    x: circle2.x, 
                    y: circle2.y, 
                    radius: this.tw
                });
                this.rainbowParams.i++;
            } else {
                this.cvsTrail.drawArc({
                    fillStyle: this.tc,
                    x: circle2.x, 
                    y: circle2.y, 
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
}


const chaotic = new Pendul("pendul", $(document).height(), $(document).width());
chaotic.init("body");
chaotic.run();