(function(exports) {
      exports.myFunction = function(myParameter) {
        console.log(myParameter);
      };

      exports.Program = function () {
          this.create = function(data) {
              this.categories = [];
              for(let i = 0; i < data.categories.length; i += 1) {
                  this.categories.push(data.categories[i])
                  for (let j = 0; j < data.indicators.length; j += 1) {
                      if (data.indicatorIds[j].categoryId == data.categories[i].id) {
                          this.categories[i].indicators = {id:data.indicatorIds[j]};
                      }
                  }
              }
          }
      }

})(typeof exports === 'undefined'? this['model']={}: exports); //source: https://stackoverflow.com/questions/3225251/how-can-i-share-code-between-node-js-and-the-browser