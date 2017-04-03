window.alert("dashboard.js");

var loadData = function(){

};

var fadeButtonsIn = function () {
    $("button").click(function(){
        $("#div1").fadeIn();
        $("#div2").fadeIn("slow");
        $("#div3").fadeIn(3000);
    });
}