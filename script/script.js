(function() {
    var SEL_NONE = 0,
        SEL_FROM = 1,
        SEL_TO = 2,
        SEL_DATE = 3,
        SEL_TIME = 4,
        MAX_QUICK_DATE = 4,
        MAX_QUICK_TIME = 6;

    var selecting = SEL_FROM; // 1: from, 2: to, 0: none
    var selected = {
        date: false,
        time: false
    }
    var param = {
        from: -1,
        from_name: "--",
        to: -1,
        to_name: "--",
        date: "",
        time: ""
    }
    var setting = {
        common_station: ["1008", "1015", "1319", "1228", "1238"],
        auto_timepicker: true,
        auto_datepicker: true,
        display_fare: true,
        display_delay: true,
        display_note: false,
        single_column: false,
        quick_date: ['今天', '明天'],
        quick_time: ['06', '09', 12, 16, 18]
    }

    var quick_date_mapping = {
        "今天": getDateFromOffsetFn(0),
        "明天": getDateFromOffsetFn(1),
        "後天": getDateFromOffsetFn(2),
        "大後天": getDateFromOffsetFn(3),
        "週一": getDateFromWeekNameFn('mon'),
        "週二": getDateFromWeekNameFn("tue"),
        "週三": getDateFromWeekNameFn("wed"),
        "週四": getDateFromWeekNameFn("thu"),
        "週五": getDateFromWeekNameFn("fri"),
        "週六": getDateFromWeekNameFn("sat"),
        "週日": getDateFromWeekNameFn("sun")
    }

    train.getStation().done(function() {
        $(function() {
            initialRange();
            initialCommonStation();
        });
    });

    $.fn.datepicker.languages['zh-TW'] = {
        format: 'yyyy年mm月dd日',
        days: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        daysShort: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
        daysMin: ['日', '一', '二', '三', '四', '五', '六'],
        months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        monthsShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        weekStart: 1,
        startView: 0,
        yearFirst: true,
        yearSuffix: '年'
    };

    var tp;
    loadSetting();

    $(function() {
        tp = timepicker(".timepicker");
        setDayFromOffset(0);
        changeActiveStation();
        updateStationField();
        initialQuickOption();
        iDeviceBackground();

        // initial
        $('.datepicker').datepicker({
            language: 'zh-TW',
            autoShow: false,
            autoHide: true,
            inline: true,
            format: 'yyyy-mm-dd'
        });

        $('[data-select-no]').click(function() {
            var self = $(this);
            selecting = self.data('select-no') - 1;
            nextSelect(true);
        });

        // Initial Range Station
        $('.range').on('change', function() {
            initialStation($(this));
        });

        $('[data-panel]').click(function() {
            var self = $(this);
            var panel = self.data('panel');
            var panel_class = '.setting-' + panel;

            $('.setting-sidebar .active').removeClass('active');
            self.addClass('active');

            $('.setting-panel').hide();
            $(panel_class).show();
        })

        showDefaultPanel();

        // Datepicker on pick
        $('.datepicker').on('pick.datepicker', function (e) {
            var datepicker = $('.datepicker');

            setDay(datepicker.datepicker('getDate', true));
        });

        $('.swap').click(function () {
            var from = param.from;
            var from_name = param.from_name;
            param.from = param.to;
            param.from_name = param.to_name;
            param.to = from;
            param.to_name = from_name;

            updateStationField();
            saveSetting();
        });
        $('.query').click(query);


        // setting
        $('.open-setting').click(function() {
            $('.setting').fadeIn(150);
        });

        $('.setting .close').click(function() {
            $('.setting').fadeOut(150);
        });
        $('.setting .quick-time input').change(function() {
            var checked_ele = $('.setting .quick-time input:checked');
            var values = [];

            if (checked_ele.length > MAX_QUICK_TIME) {
                initialQuickOption();
                return;
            }

            checked_ele.each(function() {
                values.push($(this).val());
            });

            setting.quick_time = values;
            initialQuickOption();
            saveSetting();
        });

        $('.setting .quick-date input').change(function() {
            var checked_ele = $('.setting .quick-date input:checked');
            var values = [];

            if (checked_ele.length > MAX_QUICK_DATE) {
                initialQuickOption();
                return;
            }

            checked_ele.each(function() {
                values.push($(this).val());
            });

            setting.quick_date = values;
            initialQuickOption()
            saveSetting();
        });
        bindSettingToCheckBox('single_column', $('.setting .single-column input'), function() {
            if (setting.single_column)
                $('html').addClass('single-column');
            else
                $('html').removeClass('single-column');
        });
        bindSettingToCheckBox('display_fare', $('.setting .display-fare input'));
        bindSettingToCheckBox('display_delay', $('.setting .display-delay input'));
        bindSettingToCheckBox('display_note', $('.setting .display-note input'));
        bindSettingToCheckBox('auto_timepicker', $('.setting .auto-timepicker input'));
        bindSettingToCheckBox('auto_datepicker', $('.setting .auto-datepicker input'));

        // TimePicker initial
        tp.on('changed', function (time) {
            param.time = time;
            $('.time .field-input').text(param.time);
        });

        tp.setNow();

        var sortable = Sortable.create($(".setting .common_station")[0], {
            onSort: function () {
                setting.common_station = [];
                $('.setting .option-station:not(.add)').each(function () {
                    setting.common_station.push($(this).data('value') + "");
                });
                saveSetting();
                initialCommonStation();
            }
        });
    });

    function showDefaultPanel() {
        var panel = $('.setting-sidebar .active').data('panel');
        var panel_class = '.setting-' + panel;
        $(panel_class).show();
    }

    function getDateFromOffsetFn(offset) {
        return function () {
            return moment().add(offset, 'day').format('YYYY-MM-DD');
        }
    }

    function getDateFromWeekNameFn(week_name) {
        return function () {
            var date = moment(week_name, 'ddd');
            if (date.isSameOrBefore(moment(), 'day'))
                date.add(1, 'week');
            return date.format('YYYY-MM-DD');
        }
    }

    function bindSettingToCheckBox(setting_name, checkbox, cb) {
        cb = cb || function() {}
        checkbox.prop('checked', setting[setting_name]);
        checkbox.change(function() {

            // save setting
            setting[setting_name] = checkbox.prop('checked');

            cb();

            // save setting to localStorage
            saveSetting();
        });
        cb();
    }

    function getTrainFlagClass(train_info) {
        var flags = [];

        if (train_info.WheelchairFlag)
            flags.push('flag-wheelchair');

        if (train_info.BikeFlag)
            flags.push('flag-bicycle');

        if (train_info.BreastFeedingFlag)
            flags.push('flag-breastfeeding');

        if (typeof train_info.OverNightStationID !== "undefined")
            flags.push('flag-overnight');

        return flags;
    }

    function getTrainTypeClass(train_type_name) {
        switch (train_type_name) {
            case "自強":
                return 'type-tc';
            case "莒光":
                return 'type-ck';
            case "區間":
            case "區間快":
            case "復興":
                return 'type-local';
            case "太魯閣":
                return 'type-tlk';
            case "普悠瑪":
                return 'type-pum';
        }
    }

    function getFareTypeClass(train_type_name) {
        switch (train_type_name) {
            case "自強":
            case "太魯閣":
            case "普悠瑪":
                return 'fare-tc';
            case "莒光":
                return 'fare-ck';
            case "區間":
            case "區間快":
            case "復興":
                return 'fare-local';
        }
    }

    function createTrainResultElement(train) {
        var line = train.DailyTrainInfo.TripLine;

        var train_no = train.DailyTrainInfo.TrainNo;
        var train_type_id = train.DailyTrainInfo.TrainClassificationID;

        var start_station = train.DailyTrainInfo.StartingStationName;
        var departure_time = train.OriginStopTime.DepartureTime;
        var from_station = train.OriginStopTime.StationName.Zh_tw;

        var end_station = train.DailyTrainInfo.EndingStationName;
        var arrival_time = train.DestinationStopTime.ArrivalTime;
        var to_station = train.DestinationStopTime.StationName.Zh_tw;

        var time = moment.utc(
            moment(
                moment(arrival_time, 'H:mm')
                .diff(moment(departure_time, 'H:mm'))
            )
        ).format("H:mm");

        var line_class = "";
        var train_type_name = train_type_list[train_type_id];
        var train_type_class = getTrainTypeClass(train_type_name);
        var fare_class = getFareTypeClass(train_type_name);

        var flags = getTrainFlagClass(train.DailyTrainInfo);

        if (line === 1)
            line_class = 'mountain';
        else if (line === 2)
            line_class = 'coast';

        var note = train.DailyTrainInfo.Note.Zh_tw;
        note = note.replace('每日行駛。', '');

        if (setting.display_note && note.length > 0)
            flags.push('has-note');

        if (from_station.length >= 4)
            flags.push('from-len-4');
        else if (from_station.length >= 3)
            flags.push('from-len-3');

        if (to_station.length >= 4)
            flags.push('to-len-4');
        else if (to_station.length >= 3)
            flags.push('to-len-3');


        var html = template("TRAIN_RESULT",{
            train_no: train_no,
            train_type_name: train_type_name,

            start_station: start_station,
            departure_time: departure_time,
            end_station: end_station,
            arrival_time: arrival_time,

            time: time,
            from_station: from_station,
            to_station: to_station,
            fare_class: fare_class,
            note: note
        });

        var ele = $(html)
            .addClass(line_class)
            .addClass(train_type_class)
            .addClass(flags.join(' '));

        ele.find('.order').click(function() {
            var row = $(this).parents('.train-row');
            var train_no = row.data('train-no');
            var stop_from = stop_list.filter(function(d) { return d.stop_id == param.from; })[0];
            var stop_to = stop_list.filter(function(d) { return d.stop_id == param.to; })[0];

            window.open("http://railway.hinet.net/ctno1.htm?"
                + "from_station=" + stop_from.reservation_code
                + "&to_station=" + stop_to.reservation_code
                + "&getin_date=" + moment(param.date).format('YYYY/MM/DD')
                + "&train_no=" + train_no);

        });
        return ele;
    }

    function query() {
        $('.datepicker-inline').fadeOut(150);
        tp.hide();

        $('.result .loading').show();
        $('.result').children(':not(.loading)').remove();
        $('.result').fadeIn(150);
        train.getTimeTable(param.from, param.to, param.date, param.time)
            .then(function(data) {
                $('.result .loading').hide();
                return data;
            })
            .then(function(data) {
                var no_list = [];
                for (var idx in data) {
                    $('.result').append(createTrainResultElement(data[idx]));
                }
            })
            .then(function(data) {
                if (setting.display_delay)
                    queryLiveBoard();
            })
            .then(function(data) {
                if (setting.display_fare)
                    queryFare();
            });
    }

    function queryFare() {
        train.getODFare(param.from, param.to)
            .then(function(data) {
                var fare_info = data[0].Fares;
                var fare_tc;
                var fare_ck;
                var fare_local;

                for (var i in fare_info) {
                    fare = fare_info[i];
                    switch(fare.TicketType) {
                        case "成自":
                            fare_tc = fare.Price;
                            break;
                        case "成莒":
                            fare_ck = fare.Price;
                            break;
                        case "成復":
                            fare_local = fare.Price;
                    }
                }

                $('.fare-tc').text("$" + fare_tc);
                $('.fare-ck').text("$" + fare_ck);
                $('.fare-local').text("$" + fare_local);
            });
    }

    function queryLiveBoard() {
        train.getLiveBoard(param.from)
            .then(function(data) {
                for (var i in data) {
                    var info = data[i];
                    var train_no = info.TrainNo;
                    var delay = info.DelayTime;
                    var delay_str = "準點";

                    if (delay > 0)
                        delay_str = "晚" + delay + "分";

                    $('[data-train-no=' + train_no + '] .delay').text(delay_str);
                }

            });
    }

    function nextSelect(force) {
        force = force || false;

        selecting ++;
        changeActiveStation();

        if (selecting === SEL_DATE && (force || !selected.date && setting.auto_datepicker)) {
            if (force) $('.datepicker-inline').fadeToggle(150);
            else $('.datepicker-inline').fadeIn(150);

        } else if(selecting === SEL_TIME && (force || !selected.time && setting.auto_timepicker)) {
            if (force) tp.toggle();
            else tp.show();
        }
    }

    function changeStation() {
        var self = $(this);
        var name, value;
        if (self.is('.sure')) {
            var selected = $('.search-form .selection .station :selected');
            name = selected.text();
            value = selected.val();
        } else {
            name = self.data('name');
            value = self.data('value');
        }

        if (selecting === SEL_FROM || selecting === SEL_TO) {
            setStation(selecting, name, value);
            nextSelect()
        }
    }

    function modifyStation() {
        var self = $(this);
        var name, value;
        if (self.is('.add')) {
            var selected = $('.setting .station :selected');
            value = selected.val();

            var index = setting.common_station.indexOf(value + "");
            if (index > -1) return;

            setting.common_station.push(value);
        } else {
            value = self.data('value');
            var index = setting.common_station.indexOf(value + "");
            if (index > -1) {
                setting.common_station.splice(index, 1);
            }
        }
        initialCommonStation();
        saveSetting();
    }

    function changeActiveStation() {
        if (selecting === SEL_FROM) {
            $('.from').addClass('active');
            $('.to').removeClass('active');
        } else if (selecting === SEL_TO){
            $('.from').removeClass('active');
            $('.to').addClass('active');
        } else {
            $('.from').removeClass('active');
            $('.to').removeClass('active');
        }
    }

    function setStation(from_to, name, value) {
        if (from_to === SEL_FROM) {
            param.from = value;
            param.from_name = name;
        } else if (from_to === SEL_TO) {
            param.to = value;
            param.to_name = name;
        } else {
            return;
        }

        updateStationField();
        saveSetting();
    }

    function updateStationField() {
        $(".from .field-input").text(param.from_name);
        $(".to .field-input").text(param.to_name);
    }

    function setDay(date) {
        param.date = date;
        selected.date = true;
        $('.date .field-input').text(param.date);
        $('.datepicker-inline').fadeOut();

        if (selecting == SEL_DATE)
            nextSelect();
    }

    function setDayFromOffset(offset) {
        param.date = moment().add(offset, 'days').format('YYYY-MM-DD');
        $('.date .field-input').text(param.date);
        $('.datepicker-inline').fadeOut();

        if (selecting == SEL_DATE)
            nextSelect();
    }


    // Storage Station Session
    function loadSetting() {
        if (typeof localStorage.param !== "undefined") {
            try {
                $.extend(param, JSON.parse(localStorage.param));
            } catch (e) {}
        }
        if (typeof localStorage.setting !== "undefined") {
            try {
                $.extend(setting, JSON.parse(localStorage.setting));
            } catch (e) {}
        }
    }

    function saveSetting() {
        localStorage.param = JSON.stringify(param);
        localStorage.setting = JSON.stringify(setting);
    }

    function quickOptionTime(e) {
        e.stopPropagation();
        var hour = $(this).data('value');
        tp.setTime(hour);
        tp.hide();
    }

    function quickOptionDay(e) {
        e.stopPropagation();
        var date = quick_date_mapping[$(this).data('value')]();
        setDay(date);
    }

    function initialQuickOption() {
        $('.search-form .datetime .quick-option').remove();
        $('.datetime .time .field').prepend(
            setting.quick_time.map(function(val) {
                var option = $(template('QUICK_OPTION', { label: val, value: val }));
                option.click(quickOptionTime);
                return option;
            })
        );

        $('.datetime .date .field').append(
            setting.quick_date.map(function(val) {
                var option = $(template('QUICK_OPTION', { label: val, value: val }));
                option.click(quickOptionDay);
                return option;
            })
        );

        var selector = setting.quick_time.reduce(function(selector, val) {
            return selector + ',[value="' + val + '"]';
        }, '');

        selector = setting.quick_date.reduce(function(selector, val) {
            return selector + ',[value="' + val + '"]';
        }, selector)

        $('.quick-date [type=checkbox]').prop('checked', false);
        $('.quick-time [type=checkbox]').prop('checked', false);
        $('.setting .quick-date,.setting .quick-time').find(selector.substr(1)).prop('checked', true);
    }


    function template(key, param) {
        var template = {
            TRAIN_RESULT: [
                '<div class="train-row" data-train-no="${train_no}">',
                    '<div>',
                        '<div class="line"></div>',
                        '<div class="delay"></div>',
                    '</div>',
                    '<div class="train-info">',
                        '<span class="train-type">${train_type_name}</span>',
                        '<span class="train-no">${train_no}</span>',
                    '</div>',
                    '<div class="departure">',
                        '<div class="departure-station">${start_station}</div>',
                        '<div class="from-station">${from_station}</div>',
                        '<div class="departure-time">${departure_time}</div>',
                    '</div>',
                    '<div class="time"><div class="right-arrow"></div><div class="clear"></div>${time}</div>',
                        '<div class="arrival">',
                        '<div class="arrival-station">${end_station}</div>',
                        '<div class="to-station">${to_station}</div>',
                        '<div class="arrival-time">${arrival_time}</div>',
                    '</div>',
                    '<div class="flag">',
                        '<div class="bicycle"><img src="./image/bicycle-40.png" title="自行車" width="20"></div>',
                        '<div class="wheelchair"><img src="./image/wheelchair-48.png" title="身障座位" width="20"></div>',
                        '<div class="breastfeeding"><img src="./image/breastfeeding-48.png" title="哺乳室" width="20"></div>',
                        '<div class="overnight"><img src="./image/waning_gibbous-48.png" title="跨夜" width="20"></div>',
                    '</div>',
                    '<div class="orderfare"><span class="order">訂</span><span class="fare-info ${fare_class}"></span></div>',
                    '<div class="clear"></div>',
                    '<div class="note">${note}</div>',
                '</div>'
            ].join(''),
            QUICK_OPTION: '<span class="quick-option" data-value="${value}">${label}</span>'
        };
        return formatString(template[key], param);
    }

    function formatString(str, param) {
        return str.replace(/\${([^}]+)}/g, function($0, $1) {
            if ($1 in param)
                return param[$1];

            return $1;
        });
    }

    function initialRange() {
        $('.range').children().remove();
        for(var idx = -1; idx < train_range.length; idx++) {
            var range = train_range[idx];
            $('.range').append($('<option>').val(range.id).text(range.name));
        }
    }

    function initialStation(range_element) {
        var range_value = range_element.val();
        var range = train_range[range_value];
        var stops = range.stops;
        var selection_station = range_element.parents('.selection').find('.station');
        selection_station.children().remove();
        for(var idx in stops) {
            selection_station.append(
                $('<option>')
                .val(stops[idx].StationID)
                .text(stops[idx].StationName.Zh_tw)
            );
        }

        selection_station.val(range.default_value);
    }

    function initialCommonStation() {
        var common_ele = $(".common_station");
        common_ele.children().remove();
        for (var idx in setting.common_station) {
            var station_id = setting.common_station[idx];
            var result = stop_list.filter(function(d) { return d.stop_id == station_id; });
            if (result.length > 0) {
                common_ele.append(
                    $("<span>")
                    .attr('data-value', station_id)
                    .attr('data-name', result[0].name)
                    .addClass('option-station')
                    .text(result[0].name)
                );
            }
        }

        $('.search-form .option-station').off('click', changeStation);
        $('.setting .option-station').off('click', modifyStation);

        $('.search-form .option-station').click(changeStation);
        $('.setting .option-station').click(modifyStation);
    }

    function iDeviceBackground() {
        if (navigator.platform.match(/i(Phone|Pod|Pad)/i) != null) {
            $('html').addClass('idevice');
        }
    }


})();
