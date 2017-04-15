(function (window) {
    var URL_PREFEX = "https://ptx.transportdata.tw/MOTC/v2/Rail/TRA";
    var train = window.train = {};
    function formatString(str, param) {
        return str.replace(/\${([^}]+)}/g, function($0, $1) {
            if ($1 in param)
                return param[$1];

            return $1;
        });
    }

    train.getStation = function getStation() {
        return $.ajax({
            url: URL_PREFEX + "/Station",
            data: {
                $select: "StationID,StationName,StationClass,ReservationCode",
                $format: "JSON"
            },
            datatype: "json"
        }).done(function (data) {
            var stops = [];
            for (var i in data) {
                var stop = data[i];
                if (!(stop.StationID in range_table)){
                    continue;
                }
                var ranges = range_table[stop.StationID];

                for (var id in ranges) {
                    train_range[ranges[id]].stops.push(stop);
                }

                stops[stop.StationID] = data[i];
            }

            for (var i in stop_list) {
                var stop = stop_list[i];
                stop.reservation_code = stops[stop.stop_id].ReservationCode;
            }
        });
    };

    train.getTimeTable = function getTimeTable(from, to, date, time) {
        return $.ajax({
            url:
            formatString(URL_PREFEX + "/DailyTimetable/OD/${from}/to/${to}/${date}", {
                from: from,
                to: to,
                date: date
            }),

            data: {
                $orderby: "OriginStopTime/DepartureTime",
                $filter: "OriginStopTime/ArrivalTime gt '" + time + "'",
                $format: "JSON"
            }
        });
    };

    train.getStartEndStation = function getStartEndStation(train_list, date) {
        var query_tpl = "DailyTrainInfo/TrainNo eq '%s'";

        var query =
            train_list.reduce(function(query, train) {
                return query + ' or ' + query_tpl.replace('%s', train);
            }, "")
            .substring(4);

        return $.ajax({
            url: URL_PREFEX + "/DailyTimetable/" + date,
            data: {
                $filter: query,
                $format: "JSON"
            }
        });
    }

    train.getODFare = function getODFare(from, to) {
        return $.ajax({
            url: URL_PREFEX + formatString("/ODFare/${from}/to/${to}", { from: from, to: to }),
        });
    }
})(window);
