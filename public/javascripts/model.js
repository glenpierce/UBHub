(function(exports) {
      exports.myFunction = function(myParameter) {
        console.log(myParameter);
      };

})(typeof exports === 'undefined'? this['model']={}: exports); //source: https://stackoverflow.com/questions/3225251/how-can-i-share-code-between-node-js-and-the-browser