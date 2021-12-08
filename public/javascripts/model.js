/*
We've created a class called Program here, it has 2 functions as of the writing of this doc:
create(programTemplateData) - this creates a Program instance and populates it with Categories and Indicators, but NOT user data (yet)
    -We might be adding the saved data to this at some point though.
save(programInstanceData) - This will be called when the program instance needs to be saved with user data.
    -It would be called from the Save Program Instance event.
    -We would stringify this object and send back to the server to persist it.
    -We'll need to unwrap it on the server, which is probably the code we'll add next to this file as this is accessible from front and back ends.
*/
(function(exports) {
      exports.myFunction = function(myParameter) {
        console.log(myParameter);
      };

      exports.Program = function () {
          this.create = function(programTemplateData) {
              this.id = programTemplateData.id;
              this.site = programTemplateData.site;
              this.categories = [];
              if(programTemplateData.userData != null) {
                  programTemplateData.name = programTemplateData.userData[0].name;
                  programTemplateData.year = programTemplateData.userData[0].year;
              }
              for(let i = 0; i < programTemplateData.categories.length; i += 1) {
                  this.categories.push(programTemplateData.categories[i])
                  this.categories[i].indicators = [];
                  for (let j = 0; j < programTemplateData.indicatorIds.length; j += 1) {
                      if(programTemplateData.indicatorIds[j].categoryId == this.categories[i].id) {
                          let indicatorId = programTemplateData.indicatorIds[j].indicatorTemplateId;
                          for(let k = 0; k < programTemplateData.indicators.length; k++) {
                              if(programTemplateData.indicators[k].id == indicatorId) {
                                  if(programTemplateData.userData != null) {
                                      for(let index in programTemplateData.userData) {
                                          if(programTemplateData.userData[index].indicatorId == indicatorId) {
                                              programTemplateData.indicators[k].userData = programTemplateData.userData[index];
                                          }
                                      }
                                  }
                                  this.categories[i].indicators.push(programTemplateData.indicators[k]);
                              }
                          }
                      }
                      // categoryId = programTemplateData.indicatorIds[j].categoryId;
                      // indicatorId = programTemplateData.indicatorIds[j].indicatorTemplateId;
                      // positionInCategory = programTemplateData.indicatorIds[j].positionInCategory;
                      // if (programTemplateData.indicatorIds[j].categoryId == programTemplateData.categories[i].id) {
                      //     this.categories[i].indicators.push(programTemplateData.indicators[j]);
                      // }
                  }
              }
          }

          this.save = function (programInstanceData) {
              for(let i = 0; i < programInstanceData.categories.length; i += 1) {
                  for (let j = 0; j < programInstanceData.categories[i].indicators; j += 1) {
                      this.categories[i].indicators[j].indicatorValue = programInstanceData.categories[i].indicators[j].indicatorValue;
                  }
              }
          }
      }

})(typeof exports === 'undefined'? this['model']={}: exports); //source: https://stackoverflow.com/questions/3225251/how-can-i-share-code-between-node-js-and-the-browser