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

/*--------------------------------
    Begin Form Validation
--------------------------------*/
var validatedForm = false;

$("#submit-btn").click(function(e){
    validatedForm = true;
    e.preventDefault();
    var valid = true;
    var arrInputValue = new Array(10);
    var index = 0;
    var validateMessage;

    $("form#register-form :input").each(function(){
      var input = $(this);
      var inputName = input.attr('name');
      if(typeof inputName !== 'undefined' && inputName.length > 0){
        var value = input.val();
        if(input.is(':checkbox')){
          value = input.is(":checked");
        }
        if(!input.is("textarea")){
          var error = input.parent().find(".error-message");
          if(inputName === "country"){
            error = input.parent().parent().find(".error-message");
          }
          if (value === null || value === "" || value === false || isEmpty(value)) {
            valid = false;
          }
          validateMessage = validateErrorMessage(value, error, inputName);
          if (validateMessage == false){
            valid = validateMessage;
          }
        }
        arrInputValue[index] = value;
        index += 1;
      }
    });
    if(valid){
      sendFormData(arrInputValue);
    }
 });

$('#phone-field').keypress(function (event) {
  var keycode = event.keyCode || event.which;
  if (!(event.shiftKey == false && (keycode == 8 || keycode == 9 || keycode == 32 || keycode == 37 || keycode == 39 || keycode == 45 || keycode == 46 || (keycode >= 48 && keycode <= 57)))) {
    event.preventDefault();
  }
});

$("form#register-form :input").on('input', function() {
  triggerValidation($(this));
});

$('#register-form .form-fields .country-selection .select-arrow').click(function() {
  var elem = $('#register-form .form-fields .country-selection select')
  if (document.createEvent) {
     var e = document.createEvent("MouseEvents");
     e.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
     elem[0].dispatchEvent(e);
  } else if (element.fireEvent) {
     elem[0].fireEvent("onmousedown");
  }
});

function triggerValidation(input){
  if(validatedForm){
    var inputName = input.attr('name');
    var value = input.val();
    var error = inputName == "country" ? input.parent().parent().find(".error-message") : input.parent().find(".error-message");
    validateErrorMessage(value, error, inputName);
  }
}

function validateErrorMessage(value, error, inputName){
  var validate = true;
  if(inputName === "email"){
    validate = validateEmail(value, error);
  }

  if(inputName === "phone"){
    validate = validatePhone(value, error);
  }

  if (value === null || value === "" || value === false || !validate || isEmpty(value) ) {
    error.removeClass("error-inactive");
    error.addClass("error-active");
  }
  else{
    error.removeClass("error-active");
    error.addClass("error-inactive");
  }

  validateName(inputName, error)

  if(!validate){
    return validate;
  }

}

function isEmpty(str){
  var string =  str.replace(/^\s+/, '').replace(/\s+$/, '');
  if (string === '') {return true;}
  else {return false;}
}

function validateEmail(value, error){
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var isValid = re.test(value);
  if (value === null || value === ""){
    error.text(REQUIRED_FIELD);
  }
  else{
    if(!isValid){
      error.text(VALID_EMAIL);
    }
  }
  return isValid;
}

function validatePhone(value, error){
  var isValid = true;
  if(value.length < 2){
    isValid = false;
  }
  else{
    if(!$.isNumeric(value.substr(0, 1)) || !$.isNumeric(value.substr(value.length-1, 1))) {
      isValid = false;
    }
  }
  if (value === null || value === ""){
    error.text(REQUIRED_FIELD);
  }
  else{
    if(!isValid){
      error.text(VALID_PHONE);
    }
  }
  return isValid;
}

function validateName(inputName, error){
  if(inputName === "first-name" || inputName === "last-name"){
    var nextInputError;
    if(inputName === "first-name" ){
      nextInputError= $('.last-name-box .error-message');
    }
    else{
      nextInputError= $('.first-name-box .error-message');
    }
    if(nextInputError.hasClass('error-active') && !error.hasClass('error-active')){
      error.addClass('error-hidden');
    }
    else{
      if(nextInputError.hasClass('error-inactive') && error.hasClass('error-inactive')){
        error.removeClass('error-hidden');
        nextInputError.removeClass('error-hidden');
      }
      else{
        if(error.hasClass('error-active') && !nextInputError.hasClass('error-active')){
          nextInputError.addClass('error-hidden');
        }
        else{
          error.removeClass('error-hidden');
        }
      }
    }
  }
}

function sendFormData(arrInputValue){
 var formObject = {
   "country":   arrInputValue[0],
   "firstName": arrInputValue[1],
   "lastName":  arrInputValue[2],
   "email":     arrInputValue[3],
   "phone":     arrInputValue[4],
   "company":   arrInputValue[5],
   "interest":  arrInputValue[6]
 }

 $.ajax({
   url: '/contact',
   type: 'post',
   data: formObject,
   statusCode: {
    200: function(){
      window.opener.showMessage('success', SUCCESS);
      window.close();
    },
    500: function(data){
      window.opener.showMessage('error', ERROR);
      window.close();
    }
   }
 });
}

/*--------------------------------
    End Form Validation
 --------------------------------*/
