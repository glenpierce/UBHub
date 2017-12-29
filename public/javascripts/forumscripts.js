var askQuestion = () => {
  window.location='/forum/ask';
}

var submitQuestion = (formId, refresh) => {
  var formElements = document.getElementById(formId).elements;
  var postData = {};
  for (var i = 0; i < formElements.length; i++)
      if (formElements[i].type != "button")
          postData[formElements[i].name] = formElements[i].value;
  if(postData.questionTitle != "" && postData.questionBody != "") {
    console.log(postData);
    postQuestion("/forum/submit", postData, messageCallback);
  } else {
    console.log("no post data");
  }

  if(refresh){
    location.reload();
  }

}


var postQuestion = (theUrl, questionObject, callback) => {
    let data = questionObject;
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("POST", theUrl, true); // true for asynchronous
    xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    var dataAsJson = JSON.stringify(data);
    xmlHttp.send(dataAsJson);

}


var goToPost = (id) => {
  window.location = '/forum/post?id=' +id;
}


var messageCallback = (res) => {
  window.location = JSON.parse(res).path;
}

var replyTo = (postId, parentId) => {
  if(parentId == -1) {
    //If it's a top-level post, scroll the user to the reply box.
    var askForm = document.getElementById('askForm');
    askForm.scrollIntoView(false);
    askForm.classList.add("highlighted");
  } else {
    //If it's a second-level post, unhide the post's comment box.
    var responseFormId = "responseBox" + postId;
    hideAllResponseForms();
    var responseForm = document.getElementById(responseFormId);
    responseForm.classList.remove("hide");
  }

}

var hideAllResponseForms = () => {
  var responseForms = document.getElementsByClassName('responseBox');
  for(i = 0; i < responseForms.length; i++){
    responseForms[i].classList.add("hide");
  }
}

var vote = (status, vote, postId) => {

  var url;

  if(status == 0){
    url = "/forum/vote";
  } else if (status == vote){
        url = "/forum/unvote";
  } else {
    alert("Can't vote again");
    return;
  }

  var data = {
    status,
    vote,
    postId
  }

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      //TODO: get response, update button

        location.reload();
  }
  xmlHttp.open("POST", url, true); // true for asynchronous
  xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  var dataAsJson = JSON.stringify(data);

  xmlHttp.send(dataAsJson);
  location.reload();

  //TODO Get response, callback updates vote count
}

var accept = (postId, answerId) => {
  var data = {
    postId,
    answerId
  }

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
        location.reload();
          //callback(xmlHttp.responseText);
          //TODO: get response, update button

  }
  xmlHttp.open("POST", "/forum/accept", true); // true for asynchronous
  xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  var dataAsJson = JSON.stringify(data);

  xmlHttp.send(dataAsJson);
  location.reload();

}

var test = (t) => {
  console.log(t);
}
