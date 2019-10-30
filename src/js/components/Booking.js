import {templates, select, settings, classNames} from '../settings.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';
import utils from '../utils.js';

class Booking{
  constructor(element){
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
  }

  getData(){
    const thisBooking = this;

    const startDataParams = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDataParams = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDataParams,
        endDataParams,
      ],
      eventCurrent: [
        settings.db.notRepeatParam,
        startDataParams,
        endDataParams,
      ],
      eventRepeat: [
        settings.db.repeatParam,
        endDataParams,
      ],

    };


    const urls = {
      booking:      settings.db.url + '/' + settings.db.booking
                                    + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event
                                    + '?'   + params.eventCurrent.join('&'),
      eventsRepeat:  settings.db.url + '/' + settings.db.event
                                    + '?'   + params.eventRepeat.join('&'),
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });

  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};
    const selectedDate = thisBooking.datePicker.value;

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    thisBooking.colorHourBar(selectedDate);
    thisBooking.updateDOM();
  }

  /*START NEW CODE */
  colorHourBar(date){
    const thisBooking = this;

    const rangeSlider = thisBooking.dom.wrapper.querySelector('.rangeSlider');
    let colorBar = [];

    for(let halfHour = 12; halfHour < 24; halfHour += 0.5){

      if(typeof thisBooking.booked[date][halfHour]  == 'undefined'){
        thisBooking.booked[date][halfHour] = [];
        colorBar.push('green');
      }

      if(typeof thisBooking.booked[date][halfHour]  != 'undefined'){
        if(thisBooking.booked[date][halfHour].length  == 1){
          colorBar.push('green');
        } else if(thisBooking.booked[date][halfHour].length  == 2){
          colorBar.push('orange');
        } else if(thisBooking.booked[date][halfHour].length  == 3) {
          colorBar.push('red');
        }
      }
    }

    const joinedColorBar = colorBar.join(', ');
    console.log('joinedColorBar',joinedColorBar);

    if(date){
      rangeSlider.style.setProperty('background-image', 'linear-gradient(to right,' + joinedColorBar + ')');
    } 

  }
  /* END NEW CODE */
      
  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);
    
    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){

      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      } 
      thisBooking.booked[date][hourBlock].push(table);
      
    } 
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvilable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour]  == 'undefined'
    ){
      allAvilable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);

      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      /* Selected free table */
      let busyTable = table.querySelector('.selected .booked');

      if(busyTable == null){

        table.addEventListener('click', function(){
          table.classList.add(classNames.booking.tableSelected);
          const clickedTable = table.getAttribute(settings.booking.tableIdAttribute);
          thisBooking.idTab = clickedTable;
        });

      }
      
      if(
        !allAvilable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
        table.classList.remove(classNames.booking.tableSelected);
      }
    }
  }

  sendBooking(){
    const thisBooking = this;

    const peopleAmount = thisBooking.dom.wrapper.querySelector('.people-amount .amount').value; 

    const hoursAmount = thisBooking.dom.wrapper.querySelector('.hours-amount .amount').value;

    const selectedStarters = thisBooking.dom.wrapper.querySelectorAll('.checkbox input');

    const selectedTab = thisBooking.dom.wrapper.querySelector('.selected');

    const startersElem = [];

    const url = settings.db.url + '/' + settings.db.booking;

    const payload ={
      date: thisBooking.datePicker.correctValue,
      hour : thisBooking.hourPicker.correctValue,
      duration : parseInt(hoursAmount),
      table : parseInt(thisBooking.idTab),
      repeat : false,
      ppl: parseInt(peopleAmount),
      starters: startersElem,
    };

    for(let starter of selectedStarters){
      if (starter.checked == true){
        let starterElem = starter.getAttribute('value');
        startersElem.push(starterElem);
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };
    
    fetch(url, options)
      .then(function(response){
        return response.json();
      }).then(function(parsedResponse){
        console.log('parsedResponse', parsedResponse);
      }).then(function(){
        selectedTab.classList.remove(classNames.booking.tableSelected);
      }).then(function(){
        thisBooking.getData();
      });
    

  }
  

  render(element){
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};

    thisBooking.dom.wrapper = element;

    thisBooking.dom.wrapper.innerHTML = generatedHTML;

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);

    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);

    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);

  }

  initWidgets(){
    const thisBooking = this;
    
    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.datePicker.addEventListener('updated', function(event){
      event.preventDefault();
      thisBooking.colorHourBar(thisBooking.datePicker.value);
      thisBooking.updateDOM();
    });

    thisBooking.dom.hourPicker.addEventListener('updated', function(event){
      event.preventDefault();
      thisBooking.updateDOM();
    });
    
    thisBooking.dom.wrapper.addEventListener('submit', function(event){
      event.preventDefault();
      thisBooking.sendBooking();
    });

  }
}

export default Booking;