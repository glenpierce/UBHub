var askQuestion = () => {
  window.location='/forum/ask';
}

var submitQuestion = () => {
  var formElements = document.getElementById("askForm").elements;
  var postData = {};
  for (var i = 0; i < formElements.length; i++)
      if (formElements[i].type != "button")
          postData[formElements[i].name] = formElements[i].value;
  if(postData.questionTitle != "" && postData.questionBody != "") {
    console.log(postData);
    postQuestion("/forum/submit/", postData, messageCallback);
  } else {
    console.log("no post data");
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



var messageCallback = (res) => {
  console.log (res);
  //probably redirect
}
