(function() {
    function timepicker(selector) {
        if (!(this instanceof timepicker))
            return new timepicker(selector);

        var self = this;

        self.autoInitialAPM = false;
        self.animationTime = 100;
        self.element = $(selector);
        self.element.html(template.main);
        self.time = '';
        self._on = {
            changed: function() {}
        }

        // Timepicker Clock Button
        self.element.find('.option-clock').click(function () {
            var clock = $(this).data('value');
            self.setTime(paddingZero(clock, 2) + ':00');
            self.hide();
        });

        // Timepicker Now Button
        self.element.find('.option-now').click(function () {
            self.setNow();
        });

        // Change AM/PM Clock
        self.element.find('.option-pm').click(self.show_pm.bind(self));
        self.element.find('.option-am').click(self.show_am.bind(self));

        self.setNow();
        self.initialAPM();
    }

    timepicker.prototype.on = function(key, cb) {
        this._on[key] = cb;
    };

    timepicker.prototype.initialAPM = function() {
        if (!this.autoInitialAPM) return;

        var date = new Date();
        var hour = date.getHours();
        if (hour >= 12)
            this.show_pm();
    };

    timepicker.prototype.setTime = function(time) {
        if (!time.length || time.length < 3)
            time = paddingZero(time, 2) + ':00';

        this.time = time;
        this._on.changed(this.time);
    };

    timepicker.prototype.setNow = function() {
        var date = new Date();
        var hour = paddingZero(date.getHours(), 2);
        var minute = paddingZero(date.getMinutes(), 2);

        this.setTime(hour + ':' + minute);
        this.element.fadeOut(this.animationTime);
    }

    timepicker.prototype.show_am = function() {
        var self = this;
        this.element.find('.pm-clock').fadeOut(100, function() {
            self.element.find('.am-clock').fadeIn(this.animationTime);
        });
    };

    timepicker.prototype.show_pm = function() {
        var self = this;
        this.element.find('.am-clock').fadeOut(100, function() {
            self.element.find('.pm-clock').fadeIn(this.animationTime);
        });
    };

    timepicker.prototype.show = function() {
        this.element.fadeIn(this.animationTime);
    };

    timepicker.prototype.hide = function() {
        this.element.fadeOut(this.animationTime);
    };

    timepicker.prototype.toggle = function() {
        this.element.fadeToggle(this.animationTime);
    }


    /****************  TEMPLATE *****************/
    var template = initialTemplate();
    function initialTemplate() {
        var template = {
            main:
                '<div class="option-clocks">'+
                    '<div class="am-clock">${am_clocks}</div>'+
                    '<div class="pm-clock">${pm_clocks}</div>'+
                '</div>'+
                '<div class="option-ap">${options}</div>',

            clock_button:
                '<div class="option-clock" data-value="${clock}">'+
                    '<span>${clock}</span>'+
                '</div>',

            options:
                '<div class="option-am">AM</div>'+
                '<div class="option-pm">PM</div>'+
                '<div class="option-now">現在</div>',

            am_clocks: [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11],
            pm_clocks: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        };

        template.am_clocks =
            template.am_clocks.reduce(function (html, clock) {
                return html + template.clock_button.replace(/\${clock}/g, clock);
            }, "");

        template.pm_clocks =
            template.pm_clocks.reduce(function (html, clock) {
                return html + template.clock_button.replace(/\${clock}/g, clock);
            }, "");

        template.main =
            template.main.replace(/\${([^}]+)}/g, function ($0, $1) {
                return template[$1];
            });

        return template;
    }

    function paddingZero(val, padding) {
        var str = val + "";
        for (var i = padding - str.length; i > 0; i--) {
            str = "0" + str;
        }
        return str;
    }


    window.timepicker = timepicker;
})(window);
