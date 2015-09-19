/**
 * Created by ice3x2 on 2015. 9. 16..
 */



angular.module('app').service('StatusListNormalizer', function() {

    var NIL_VALUE = -100;

    this.normalizeStatusList = function(statusList,reference,selectDate) {
        return buildNormalStatusList(statusList,reference,selectDate);
    }

    function buildNormalStatusList(statusList,reference,selectDate) {
        var selectedDate = new Date(selectDate) || new Date();
        var list = [];
        var listIdx = 0;
        var dummy = {time : 0, humidity : NaN, power : NaN, temperature : NaN};
        var idx = 0;
        var times = {
            before : 0,
            current : 0,
            next : 0,
            end : 0
        };
        initTimes(selectedDate,reference, times);

        do {
            if(idx >= statusList.length || times.current < statusList[idx].time) {
                dummy.time = times.current;
                list.push(_.clone(dummy));
            } else {
                statusList[idx].humidity = (statusList[idx].humidity <= NIL_VALUE)?undefined:statusList[idx].humidity;
                statusList[idx].temperature = (statusList[idx].temperature <= NIL_VALUE)?undefined:statusList[idx].temperature;
                list.push(statusList[idx]);
                ++idx;
            }
            if(reference == 'h') {
                list[listIdx].date = new Date(list[listIdx].time).getMinutes();
            }
            else if(reference == 'd') {
                list[listIdx].date = new Date(list[listIdx].time).getHours();
            }
            else if(reference == 'm') {
                list[listIdx].date = new Date(list[listIdx].time).getDate();
            }
            else if(reference == 'y') {
                list[listIdx].date = new Date(list[listIdx].time).getMonth() + 1;
            }
            nextTimes(reference, times);
            ++listIdx;
        } while(times.current < times.end);

        return list;
    }



    function initTimes(startDate, reference, times) {
        startDate.setMinutes(0); startDate.setMilliseconds(0);
        var endDate, beforeDate, nextDate ;
        if(reference == 'd') {
            startDate.setHours(0);
            endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);
            beforeDate.setHours(startDate.getHours() -1);
            nextDate.setHours(startDate.getHours() + 1);
        } else if(reference == 'h') {
            endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1);
            beforeDate.setMinutes(startDate.getMinutes() -1);
            nextDate.setMinutes(startDate.getMinutes() + 1);
        } else if(reference == 'm') {
            startDate.setHours(0); startDate.setDate(1);
            endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + 1);
            beforeDate.setDate(startDate.getDate() -1);
            nextDate.setDate(startDate.getDate() + 1);
        } else if(reference == 'y') {
            startDate.setHours(0); startDate.setDate(1); startDate.setMonth(0);
            endDate = new Date(startDate); beforeDate = new Date(startDate); nextDate = new Date(startDate);
            endDate.setFullYear(startDate.getFullYear() + 1);
            beforeDate.setMonth(startDate.getMonth() -1);
            nextDate.setMonth(startDate.getMonth() + 1);
        }
        times.before = beforeDate.getTime();
        times.next = nextDate.getTime();
        times.current = startDate.getTime();
        times.end = endDate.getTime();
    }

    function nextTimes(reference,times) {
        times.before = times.current;
        times.current = times.next;
        var currentDate = new Date(times.current);
        var nextDate = new Date(times.current);
        if(reference == 'd') {
            nextDate.setHours(currentDate.getHours() + 1);
        } else if(reference == 'h') {
            nextDate.setMinutes(currentDate.getMinutes() + 1);
        } else if(reference == 'm') {
            nextDate.setDate(currentDate.getDate() + 1);
        } else if(reference == 'y') {
            nextDate.setMonth(currentDate.getMonth() + 1);
        }
        times.next = nextDate.getTime();
    }


});
