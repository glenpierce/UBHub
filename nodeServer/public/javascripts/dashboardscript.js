function httpGetAsync(theUrl, callback){
    var user = "";
    var pass = "";
    var data = {
        "username": user,
        "password": pass
    };
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    };
    xmlHttp.open("POST", theUrl, true); // true for asynchronous
    xmlHttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    var dataAsJson = JSON.stringify(data);
    xmlHttp.send(dataAsJson);
}