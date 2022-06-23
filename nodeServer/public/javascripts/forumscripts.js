const askQuestion = () => {
  window.location='/forum/ask';
};

const submitComment = (formId, refresh) => {
    const formElements = document.getElementById(formId).elements;
    let postData = {};
    for (let i = 0; i < formElements.length; i++)
        if (formElements[i].type != "button")
            postData[formElements[i].name] = formElements[i].value;
    // postData.questionBody = simplemde.value();
    if(postData.questionTitle != "" && postData.questionBody != "") {
        console.log(postData);
        postQuestion("/forum/submit", postData, messageCallback);
    } else {
        console.log("no post data");
    }

    if(refresh){
        location.reload();
    }

};

const submitQuestion = (formId, refresh) => {
  const formElements = document.getElementById(formId).elements;
  let postData = {};
  for (let i = 0; i < formElements.length; i++)
      if (formElements[i].type != "button")
          postData[formElements[i].name] = formElements[i].value;
  postData.questionBody = simplemdeQuestion.value();
  if(postData.questionTitle != "" && postData.questionBody != "") {
    console.log(postData);
    postQuestion("/forum/submit", postData, messageCallback);
  } else {
    console.log("no post data");
  }

  if(refresh){
    location.reload();
  }

};


const postQuestion = (theUrl, questionObject, callback) => {
    let data = questionObject;
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    };
    xmlHttp.open("POST", theUrl, true); // true for asynchronous
    xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    const dataAsJson = JSON.stringify(data);
    console.log(dataAsJson);
    xmlHttp.send(dataAsJson);

};


const goToPost = (id) => {
  window.location = '/forum/post?id=' +id;
};


const messageCallback = (res) => {
  window.location = JSON.parse(res).path;
};

const replyTo = (postId, parentId) => {
  if(parentId == -1) {
    //If it's a top-level post, scroll the user to the reply box.
    const askForm = document.getElementById('askForm');
    askForm.scrollIntoView(false);
    askForm.classList.add("highlighted");
  } else {
    //If it's a second-level post, unhide the post's comment box.
    const responseFormId = "responseBox" + postId;
    hideAllResponseForms();
    let responseForm = document.getElementById(responseFormId);
    responseForm.classList.remove("hide");
  }

};

const hideAllResponseForms = () => {
  let responseForms = document.getElementsByClassName('responseBox');
  for(let i = 0; i < responseForms.length; i++){
    responseForms[i].classList.add("hide");
  }
};

const vote = (status, vote, postId) => {

  let url;

  if(status == 0){
    url = "/forum/vote";
  } else if (status == vote){
        url = "/forum/unvote";
  } else {
    alert("Can't vote again");
    return;
  }

  let data = {
    status,
    vote,
    postId
  };

  const xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      //TODO: get response, update button

        location.reload();
  };
  xmlHttp.open("POST", url, true); // true for asynchronous
  xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  const dataAsJson = JSON.stringify(data);

  xmlHttp.send(dataAsJson);
  location.reload();

  //TODO Get response, callback updates vote count
};

const accept = (postId, answerId) => {
  let data = {
    postId,
    answerId
  };

  const xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
        location.reload();
          //callback(xmlHttp.responseText);
          //TODO: get response, update button

  };
  xmlHttp.open("POST", "/forum/accept", true); // true for asynchronous
  xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  const dataAsJson = JSON.stringify(data);

  xmlHttp.send(dataAsJson);
  location.reload();

};

const resortBy = (sort) => {
  reloadLocationWithNewParam("sort", sort);
};

const turnPage = (pg) => {
  reloadLocationWithNewParam("page", pg);
};

const reloadLocationWithNewParam = (key, val) => {
  //Splits the query parameters to an array of key-value pairs.
  let params = window.location.search.substr(1).split("&&").map((x) => {
    return x.split("=");
  });

  let paramsString = "?";
  let found = false;

  for (let i = 0; i < params.length; i++){
    //Check if this is the param we're modifying. If it is, change its value and
    //set the found flag to true.
    if(params[i][0] === key) {
      params[i][1] = val;
      found = true;
    }

    //If not undefined, concatenate this key value pair to the params string
    if(params[i][1]){
      paramsString += params[i][0] + "=" + params[i][1] + "&&";
    }
  }

  //If found, no need for final &&s. Else, we need to keep the terminal &&s and
  //add the new key value pair to the string.
  if(found){
    paramsString = paramsString.slice(0, -2);
  } else {
    paramsString += key + "=" + val;
  }

  //And away we go.
  const loc = window.location.origin + window.location.pathname + paramsString;
  window.location.assign(loc);
};

const test = (t) => {
  console.log(t);
};
