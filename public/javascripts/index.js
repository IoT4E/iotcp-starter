/********************************************************* {COPYRIGHT-TOP} ***
* IBM Confidential
* OCO Source Materials
* IoT for Electronics - SVL720160500
*
* (C) Copyright IBM Corp. 2016  All Rights Reserved.
*
* The source code for this program is not published or otherwise  
* divested of its trade secrets, irrespective of what has been 
* deposited with the U.S. Copyright Office.
********************************************************* {COPYRIGHT-END} **/

var numberOfDevices = 0;
var MAX_DEVICES = 5;

$(document).ready(function(){

  $('#addNewDeviceButton').prop('disabled', false);
  $('#addNewDeviceButton img').attr("src","../images/PlusWasher_en.svg");

  function getSimulationStatus(){
    $.ajax({
      url: '/simulatorStatus',
      type: 'GET',
      success: function(status){
        if(status.running){
          getDevices();
        } else if(status.state && status.state == "pending"){
          setTimeout(function(){
            getSimulationStatus();
          }, 3000);
        } else {
          restartSimulator();
        }
      },
      error: function(e){
        console.log(e.responseText);
      }
    });
  }

  function restartSimulator(){
    $.ajax({
      url: '/restartSimulator',
      type: 'GET',
      success: function(){
        setTimeout(function(){
          getSimulationStatus();
        }, 3000);
      },
      error: function(e){
        console.log(e.responseText);
      }
    });
  }

  function getDevices(){
    $.ajax({
      url: '/washingMachine/getStatus',
      type: 'GET',
      timeout: 60000,
      statusCode: {
        500: function(response){
          setTimeout(function(){
            getDevices();
          }, 1000);
        }
      },
      success: function(data){
        $.each(data, function(index, value){
          numberOfDevices++;
          $('.list-group').append('<button class="list-item"><span>' + index + '</span></button>');
          if(numberOfDevices === MAX_DEVICES) {
            $('#addNewDeviceButton').prop('disabled', true);
            $('#addNewDeviceButton img').attr("src","../images/PlusWasher_dis.svg");
          }
        });
        validateNoWasherMessage();
        validateMaxWasherMessage();
        $('#ajaxBusy').hide();
        if(numberOfDevices !== MAX_DEVICES){
          $('#addNewDeviceButton').prop('disabled', false);
          $('#addNewDeviceButton img').attr("src","../images/PlusWasher_en.svg");
        }
      },
      error: function(x, t, m){
        if(t === "timeout") {
          $('#alertError p').html(TIMEOUT_LIST);
          $('.alert-messages, #alertError').fadeTo(500, 1);
          restartSimulator();
        }
      }
    });
  }

  function createDevices(){
    $.ajax({
       url: '/washingMachine/createDevices/1',
       type: 'POST',
       timeout: 30000,
       success: function(data){
         $.each(data, function(index, value){
           $('.list-group').append('<button class="list-item"><span>' + value.deviceID + '</span></button>');
         });

         if(numberOfDevices !== MAX_DEVICES){
          $('#addNewDeviceButton').prop('disabled', false);
          $('#addNewDeviceButton img').attr("src","../images/PlusWasher_en.svg");
         }
         
         validateNoWasherMessage();
         validateAppExperienceWasherMessage();
         //analytics.track("IoT for Electronics -> Add Device", {});
         $('#ajaxBusy').hide();
         if(numberOfDevices !== MAX_DEVICES){
          $('#addNewDeviceButton').prop('disabled', false);
          $('#addNewDeviceButton img').attr("src","../images/PlusWasher_en.svg");
         }
       },
      error: function(x, t, m){
        if(t === "timeout") {
          $('#alertError p').html(TIMEOUT_CREATE);
          $('.alert-messages, #alertError').fadeTo(500, 1);
          restartSimulator();
        }
      }
     });
  }

  getSimulationStatus();
  validateAppExperienceWasherMessage();

  $(document).on('click', '#addNewDeviceButton', function(e){
    //analytics.track("IoT for Electronics -> Add Device", {});
    e.preventDefault();
    $('#addNewDeviceButton').prop('disabled', true);
    $('#addNewDeviceButton img').attr("src","../images/PlusWasher_dis.svg");
    if(numberOfDevices < MAX_DEVICES) {
      numberOfDevices++;

      // TODO: Uncomment the snippet below (it was commented out for testing purposes)

      createDevices();

      // TODO: Remove the snippet below (I added it for testing purposes)
      // validateNoWasherMessage();
      // validateAppExperienceWasherMessage();
      // $('.list-group').append('<button class="list-item"><span>Washer ' + numberOfDevices + '</span></button>');
      // *****


      if(numberOfDevices === MAX_DEVICES) {
        $('#addNewDeviceButton').prop('disabled', true);
        $('#addNewDeviceButton img').attr("src","../images/PlusWasher_dis.svg");
        validateMaxWasherMessage();
      }
    }
  });

  $('.washer-list .list-group').on("click", ".list-item", function(){
    $('.washer-list .list-group .list-item').removeClass('active');
    $(this).addClass('active');

    window.open(
      // TODO: Uncomment the line below and comment out the line with './washer.html'
      './washingMachine/' + $(this).find('span').text(),
      // './washer.html',
      '_blank' // <- This is what makes it open in a new window.
    );
  });

  $('.selection-box').click(function() {
    $('.selection-box').removeClass('active');
    $(this).addClass('active');
    //Change the content from the selection box
    $('.description-box').addClass('hidden');
    $('.description-box[name=description-' + $(this).attr('name') + ']').removeClass('hidden');
    validateAppExperienceWasherMessage();
  });

  $('.problem-machine-icons button').click(function() {
    $('.problem-machine-icons button').removeClass('active');
    $(this).addClass('active');
  });

  function validateAppExperienceWasherMessage(){
    var appNoWasherMessage = $('.appxp-washer-message');
    var installationSection = $('.installation-section');
    if ($('.selection-box.active').attr('name') === 'selection-box-2'){
      if(numberOfDevices < 1){
        appNoWasherMessage.removeClass('hidden');
      }
      if(numberOfDevices > 0 ){
        appNoWasherMessage.addClass('hidden');
      }
      installationSection.removeClass('hidden');
    }
    else{
      appNoWasherMessage.addClass('hidden');
      installationSection.addClass('hidden');
    }
  }
  // explore more modal iotp
  $("#openIotPModal").click(function(e){
    e.preventDefault();
    $("#exploreMoreIoTP").css("display", "block");
  });

  // explore more modal node-red
  $("#openNoderedModal").click(function(e){
    e.preventDefault();
    $("#exploreMoreNodeRed").css("display", "block");
  });

  $('.closeModal').click(function(e){
    e.preventDefault();
    $("#exploreMoreIoTP").css("display", "none");
    $("#exploreMoreNodeRed").css("display", "none");
  })

  $('#nodeRedLink').click(function(e){
    var windowUrl = window.location.href;
    console.log("URL --> "+ windowUrl);
    window.open(
      './red',
      '_blank'
    );
  })  
});

function validateNoWasherMessage(){
  var noWashersMessage = $('.washer-list .no-washers-message');
  if(numberOfDevices < 1 && noWashersMessage.hasClass("hidden")){
    noWashersMessage.removeClass('hidden');
  }
  if(numberOfDevices > 0 && !noWashersMessage.hasClass("hidden")){
    noWashersMessage.addClass('hidden');
  }
}

function validateMaxWasherMessage(){
  var maxMessage = $('.max-washer-message');
  var addMessage = $('.add-washer-message');
  if(numberOfDevices === MAX_DEVICES && maxMessage.hasClass('hidden')){
    maxMessage.removeClass('hidden');
    addMessage.addClass('hidden');
  }
  if(numberOfDevices < MAX_DEVICES && !maxMessage.hasClass('hidden')){
    maxMessage.addClass('hidden');
    addMessage.removeClass('hidden');
  }
}

function removeDevice(deviceID){
 $('.washer-list .list-group .list-item').each(function(){
  if(deviceID === $(this).find('span').text()){
    numberOfDevices--;
    $(this).remove();
    $('#alertDeviceDeleted p').html(DEVICE_DELETED_MSG);
    var text = $('#alertDeviceDeleted p').html();
    $('#alertDeviceDeleted p').html(text.replace(/^([\w\-!]+)/i, '<strong>$&</strong>').replace('{0}', deviceID));
    $('.alert-messages, #alertDeviceDeleted').fadeTo(500, 1);

    setTimeout(function(){
      $('.alert-messages, #alertDeviceDeleted').fadeTo(500, 0, function(){
        $(this).hide();
      });
    }, 3000);

    if(numberOfDevices !== MAX_DEVICES){
      $('#addNewDeviceButton').prop('disabled', false);
      $('#addNewDeviceButton img').attr("src","../images/PlusWasher_en.svg");
    }
    validateNoWasherMessage();
    validateMaxWasherMessage();
  }
 });
}

$('#alertDeviceDeleted a').on('click', function(e){
  e.preventDefault();
  $('.alert-messages, #alertDeviceDeleted').fadeTo(500, 0, function(){
    $(this).hide();
  });
});

function showMessage(type, message){
  var alertId = '';
  if(type == 'success')
    alertId = '#alertDeviceDeleted';
  else if(type == 'error')
    alrtId = '#alertError';

  $(alertId + ' p').html(message);
  $('.alert-messages, ' + alertId).fadeTo(500, 1);
  setTimeout(function(){
    $('.alert-messages, ' + alertId).fadeTo(500, 0, function(){
      $(this).hide();
    });
  }, 3000);
}

$('#alertError a').on('click', function(e){
  e.preventDefault();
  $('.alert-messages, #alertError').fadeTo(500, 0, function(){
    $(this).hide();
  });
});

// Setup the ajax indicator
$('body').append('<div id="ajaxBusy"><p><img src="images/loading.gif"></p></div>');

$('#ajaxBusy').css({
  display:"none",
  margin:"0px",
  paddingLeft:"0px",
  paddingRight:"0px",
  paddingTop:"0px",
  paddingBottom:"0px",
  position:"fixed",
  left:"50%",
  top:"50%",
  width:"auto"
});

// Ajax activity indicator bound to ajax start/stop document events
$(document).ajaxStart(function(){
  $('#ajaxBusy').show();
  $('#addNewDeviceButton').prop('disabled', true);
  $('#addNewDeviceButton img').attr("src","../images/PlusWasher_dis.svg");
});

//Scroll page control
$('.ibm-top-link').click(function() {
		$('html, body').animate({scrollTop : 0},400);
		return false;
});

$(window).scroll(function (event) {
    var scroll = $(window).scrollTop();
    var topLink = $('.ibm-top-link');
    if (scroll > 0){
      if(topLink.hasClass('hidden')){
        topLink.removeClass('hidden');
      }
    }
    else {
      if(!topLink.hasClass('hidden')){
        topLink.addClass('hidden');
      }
    }
});