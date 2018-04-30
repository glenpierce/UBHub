

  var markers = [];
  var greyImage;
  var blueImage;
  var greenImage;
  var yellowImage;
  var lightOrangeImage;
  var orangeImage;


  var currentActiveHighlightingButton;
  var activeFilters = [];

  var activeZindex = 100;
  var inactiveZindex = 5;




function getPrograms(partName, markers, callback){
  var xhr = new XMLHttpRequest();
  var parameters =
    {
      programName: partName
    };

  xhr.onreadystatechange = () => {
    if(xhr.readyState == 3) {

    } else if(xhr.readyState == 4 && xhr.status == 200) {
      callback(markers, JSON.parse(xhr.responseText));
    }
  };

  xhr.open("POST", "/map/getProgramMembers", true);
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  var parametersAsJSON = JSON.stringify(parameters);
  xhr.send(parametersAsJSON);
}

function makeIconArray(colorLevels) {
  var levels = colorLevels.split(", ");
  var iconArray = [];
  for (i = 0; i < levels.length; i++){
    var icon = getIconByIndex(i);
    var entry = {
      level: levels[i],
      icon: icon
    }
    iconArray.push(entry);
  }
  return iconArray;
}



function getIconByIndex(index) {
  var activeIcons = [
    orangeImage,
    lightOrangeImage,
    yellowImage,
    greenImage,
    blueImage
  ]
  return activeIcons[index];
}

function setMarkerFocusZindex(marker, highlight){
  if (highlight) {
    marker.setZIndex(activeZindex);
  } else {
    marker.setZIndex(inactiveZindex);
  }
}

//UI

function togglePanelOpenOrClosed(tab, panelId){
  var panel = document.getElementById(panelId);
  var status = panel.classList.contains("hide");
  if(status){
    panel.classList.remove("hide");
    tab.classList.add("active");
  } else {
    panel.classList.add("hide");
    tab.classList.remove("active");
  }
}

function closeAllPanels(){
  var panels = document.getElementsByClassName("mapInfoContent");
  for(let i = 0; i < panels.length; i++){
    panels[i].classList.add("hide");

  }
}

//FILTER
/*function filter(value, filterBy, type){
  console.log(activeFilters);
    if(value == "none"){
        return;
    }

  if(type == "select"){

    filterValues(value, filterBy);

  } else if (type == "range") {

    filterRange(value, filterBy);

  } else if (type == "program") {
    console.log("p");
    filterHasProgram(value, "part_name");

  } else if (type == "nullable") {
        switch (value) {
            case "Biodiversity Website":
                nullableValue = "biodiversity_url";
                break;
            case "Biodiversity in a Comprehensive Plan":
                nullableValue = "intplan_title";
                break;
            case "Biodiversity Plan":
                nullableValue = "plan1_title";
                break;
            case "Biodiversity Report":
                nullableValue = "report_title";
                break;
            case "Local Action for Biodiversity":
                nullableValue = "LAB_joined";
                break;
            default:
                return;
        }
        filterNotNull(nullableValue);
  } else {
    console.log("Unexpected filter type: " + type);
  }

};*/

function runFilters(){
  markers.forEach((marker) => {
    var retain = true;
    activeFilters.forEach((filter) => {
      if(retain) {
        retain = evaluateFilterOnMarker(filter, marker);
      }
    });
    marker.setVisible(retain);
  });

  //Also update the table of results
}

function filterValues(value, filterBy){
  markers.forEach(function (marker) {
      marker.setVisible(marker.element[filterBy] == value);
  });
}

function filterRange(value, filterBy){
  var upper;
  var lower;
  value = value.replace(/\,/g,"");
  var values = value.split("-");
  if(values.length != 2){
    if(value[0] == "<") {
      lower = 0;
      upper = value.substr(1, value.length);
    } else if (value[0] == ">"){
      lower = value.substr(1, value.length);
      upper = Number.MAX_VALUE;
    }
  } else {
    upper = values[1];
    lower = values[0];
  }
  markers.forEach(function (marker) {
      if(!(marker.element[filterBy] > lower && marker.element[filterBy] < upper)){
          marker.setVisible(false);
      }
  });
}

function filterHasProgram(value, field){

  markers.forEach(function (marker) {
    marker.participation.forEach(function (part) {
      if(part.part_category != value) {
        marker.setVisible(false);
      }
    });
  });
}

function markerHasProgramField(marker, value, field) {
    if (marker.element.participation == undefined) {
        return false;
    }

    let returnValue = false;

    marker.element.participation.forEach(function (part) {
      if (field == "part_name" && part.part_name == value) {
        returnValue = true;
      }
    });

    return returnValue;
}

  function markerHasDocumentField(marker, value, field) {
      if (marker.element.document == undefined) {
          return false;
      }

      let returnValue = false;

      marker.element.document.forEach(function (document) {
          if (field == "doc_type" && document.doc_type == value) {
              returnValue = true;
          }
      });

      return returnValue;
  }


function addFilter(filterKey, filterValue, filterType){

  var upper = null;
  var lower = null;
  if(filterType == "range") {
    var value = filterValue.replace(/\,/g,"");
    var values = value.split("-");
    if(values.length != 2){
        values = values[0].toString();
      if(values.charAt(0) == "<") {
        lower = 0;
        upper = values.substr(1, value.length);
      } else if (values.charAt(0) == ">"){
        lower = values.substr(1, value.length);
        upper = Number.MAX_VALUE;
      }
    } else {
      upper = values[1];
      lower = values[0];
    }
  }


  removeFilter(filterKey);
  activeFilters.push({
    key: filterKey,
    val: filterValue,
    type: filterType,
    upper: upper,
    lower: lower
  });


  onFilterUpdate();

  //console.log(activeFilters);
}

function removeFilter(filterKey){
  activeFilters = activeFilters.filter( (x) => {
    return x.key != filterKey;
  });
}

function clearInactiveFilters(){
  activeFilters = activeFilters.filter( (x) => {
    return x.val != "none" ;
  });
}

function clearFiltersList(){
  activeFilters = [];
}

function evaluateFilterOnMarker(filter, marker){
  switch(filter.type){
    case "select":
      return (marker.element[filter.key] == filter.val);
    case "range":
      return ((marker.element[filter.key] > filter.lower && marker.element[filter.key] < filter.upper));
    case "program":
      return markerHasProgramField(marker, filter.val, filter.key);
    case "document":
      return markerHasDocumentField(marker, filter.val, filter.key);
    default:
      return false;
  }
}

function onFilterUpdate(){
  clearInactiveFilters();
  runFilters();
  getTableData(1, activeFilters);
  getResultCounts(activeFilters);
}

//TODO: filters need to remember all active filtering, not just latest

function selectHighlight(filterBy, colorBy, colorLevels, buttonNode){
  highlightValues(filterBy, colorBy, colorLevels);
  if(currentActiveHighlightingButton != null){
    currentActiveHighlightingButton.classList.remove("activeButton");
  }
  currentActiveHighlightingButton = buttonNode;
  buttonNode.classList.add("activeButton");
}


function highlightValues(filterBy, colorBy, colorLevels){
  var callback = (markers, programs) => {
    var iconArray = makeIconArray(colorLevels);

    markers.forEach(function (marker) {
      var found = false;

      programs.forEach(function (program) {
        if(marker.element.id == program.inst_id) {

          switch (colorBy) {

            case "part_level":
              var icon = blueImage;
              for (i = 0; i < iconArray.length; i++) {
                if (iconArray[i].level == program.part_level) {
                  icon = iconArray[i].icon;
                }
              }
              marker.setIcon(icon);
            break;

            default:
              marker.setIcon(orangeImage);
            break;

          }
          found = true;
          setMarkerFocusZindex(marker, true);
        }
      });

      if (!found) {
        marker.setIcon(greyImage);
        setMarkerFocusZindex(marker, false);
      }

    });
  };

  getPrograms(filterBy, markers, callback);
}



  function filterNotNull(filterBy) {
      markers.forEach(function (marker) {
          if(marker.element[filterBy] == null){
              marker.setVisible(false);
          }
      });
  };

  function filterArrayNotNull(...filterBy) {
      markers.forEach(function (marker) {
          let toFilter = false;
          for (i = 0; i < filterBy.length; i++) {
              if (marker.element[filterBy[i]] != null) {
                  toFilter = true;
              }
          }
          if(toFilter){
              marker.setIcon(orangeImage);
          } else {
              marker.setIcon(greyImage);
          }
      });
  };

  function resetFilter(){
      markers.forEach(function (marker) {
          marker.setVisible(true);
          marker.setIcon(greyImage);
      });

      var selectBoxes = document.getElementsByClassName("filterBox");
      for(i = 0; i < selectBoxes.length; i++){
          selectBoxes.item(i).children[0].selectedIndex = 0;
      }

      var activityButtons = document.getElementsByClassName("activeButton");
      for(i = 0; i < activityButtons.length; i++){
          activityButtons[0].classList.remove("activeButton");
      }

      activeFilters = [];
      onFilterUpdate();

  };

  function getTableData(pg, filters){
    if(pg < 1) pg = 1;
    var xhr = new XMLHttpRequest();
    var parameters =
      {
        page: pg,
        filters: filters
      };

    xhr.onreadystatechange = () => {
      if(xhr.readyState == 3) {
        tableResponse("Processing");
      } else if(xhr.readyState == 4 && xhr.status == 200) {
        tableResponse(xhr.responseText);
      }
    };

    //xhr.open("GET", "/map/tableData?page=" + pg + "&&filters==" + JSON.stringify(filters), true);
    xhr.open("POST", "/map/tableData", true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    var parametersAsJSON = JSON.stringify(parameters);
    xhr.send(parametersAsJSON);

  }

  function tableResponse(response){
    document.getElementById("mapTableValues").innerHTML = response;
  }

  function tableNextPage(){
    tablePage(1);
  }

  function tablePrevPage(){
    tablePage(-1);
  }

  function tablePage(dx){
    var tbody = document.getElementById("mapTableValues");
    var num = parseInt(tbody.getAttribute("page"));
    num += dx;
    if(num > 0){
      tbody.setAttribute("page", num);
      getTableData(num, activeFilters);

      if(num <= 1) {
        document.getElementById("mapControlPrevious").classList.add("disabled");
      } else {
        document.getElementById("mapControlPrevious").classList.remove("disabled");
      }
    }
  }

  function getResultCounts(filters){
    var xhr = new XMLHttpRequest();
    var parameters =
      {
        filters: filters
      };

    xhr.onreadystatechange = () => {
      if(xhr.readyState == 3) {
        getResultCountsResponse("Processing");
      } else if(xhr.readyState == 4 && xhr.status == 200) {
        getResultCountsResponse(xhr.responseText);
      }
    };

    //xhr.open("GET", "/map/tableData?page=" + pg + "&&filters==" + JSON.stringify(filters), true);
    xhr.open("POST", "/map/resultCounts", true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    var parametersAsJSON = JSON.stringify(parameters);
    xhr.send(parametersAsJSON);
  }

  function getResultCountsResponse(responseText){
    if(responseText == "Processing" ){

      document.getElementById("summaryTotal").innerHTML = "...";
      document.getElementById("summaryMunicipalities").innerHTML = "...";
      document.getElementById("summaryDistricts").innerHTML = "...";
      document.getElementById("summaryCampuses").innerHTML = "...";

    } else {
       var response = JSON.parse(responseText);

       document.getElementById("summaryTotal").innerHTML = response.total;
       document.getElementById("summaryMunicipalities").innerHTML = response.municipalities;
       document.getElementById("summaryDistricts").innerHTML = response.districts;
       document.getElementById("summaryCampuses").innerHTML = response.campuses;

    }
  }

/*Map popup display functions*/
  function getMapPopupContent(entry) {
      if (entry == undefined) {
        return "undefined";
      }

        var contentString = '<div id="content" style="max-height: 200px;">' +
            '<div id="siteNotice">' +
            '</div>' +
            '<div style="font-weight:bold; font-size:20px;">' + entry.inst_title + '</div>' +
            '<div class="bodyContent">' +
            (entry.scale  !== null ?  '<div>' + entry.scale + '</div>' : "") +
            (entry.biodiversity_url  !== null ?  '<div><a href="' + entry.biodiversity_url + '" rel="noopener noreferrer" target="_blank"">Main link</a></div>' : "");

            //TODO: add current program information, available docs etc. here

        if (entry.participation != undefined) {
          contentString += '<h4>Biodiversity Programs:</h4>';
          entry.participation.forEach((part) => {
            contentString += '<p>';
            if (part.part_year != null) {
              contentString += part.part_year + " ";
            }
            contentString += '<a href="' + part.part_link + '" target="_blank">' + part.part_name +'</a>';

            if (part.part_level != null) {
              contentString += ' (' + part.part_level + ')';
            }
            contentString += '</p>';
          });
        }

      if (entry.document != undefined) {
          contentString += '<h4>Biodiversity Activities:</h4>';
          entry.document.forEach((document) => {
              contentString += '<p>';
              if (document.doc_year != null) {
                  contentString += document.doc_year + " ";
              }
              contentString += '<a href="' + document.doc_url + '" target="_blank">' + document.doc_title +'</a>';

              if (document.doc_type != null) {
                  contentString += ' (' + document.doc_type + ')';
              }
              contentString += '</p>';
          });
      }

        contentString += '</div></div>';
        return contentString;
  }

  function outputLinkForMapPopup(label, url) {

  }

  function initMap (mapData) {
    console.log(mapData);
    greyImage = {
        url: '/images/marker_0_grey_39x59.png',
        scaledSize: new google.maps.Size(20, 30),
        //origin: new google.maps.Point(0, 0),
        //anchor: new google.maps.Point(11, 35)
    };
    blueImage = {
        url: '/images/marker_1_blue_39x59.png',
        scaledSize: new google.maps.Size(20, 30),
        //origin: new google.maps.Point(0, 0),
        //anchor: new google.maps.Point(11, 35)
    };
    greenImage = {
        url: '/images/marker_2_green_39x59.png',
        scaledSize: new google.maps.Size(20, 30),
        //origin: new google.maps.Point(0, 0),
        //anchor: new google.maps.Point(11, 35)
    };
    yellowImage = {
        url: '/images/marker_3_yellow_39x59.png',
        scaledSize: new google.maps.Size(20, 30),
          //origin: new google.maps.Point(0, 0),
          //anchor: new google.maps.Point(11, 35)
    };
    lightOrangeImage = {
        url: '/images/marker_4_ltorange_39x59.png',
        scaledSize: new google.maps.Size(20, 30),
          //origin: new google.maps.Point(0, 0),
          //anchor: new google.maps.Point(12, 46)
    };
    orangeImage = {
        url: '/images/marker_5_orange_39x59.png',
        scaledSize: new google.maps.Size(20, 30),
          //origin: new google.maps.Point(0, 0),
          //anchor: new google.maps.Point(11, 35)
    };
      //var mapData =!{mapData};
      center = {lat: 20, lng: 15};
      var map = new google.maps.Map(document.getElementById('map'), {
          zoom: 2, streetViewControl: false,
          center: center,
          styles: [{"elementType": "geometry","stylers": [{"color": "#b6d5e3"}]},
          {"elementType": "labels.text.fill","stylers": [{"color": "#6da4c7"}]},
          {"elementType": "labels.text.stroke","stylers": [ { "color": "#b6d5e3" } ]},
          {"featureType": "administrative","stylers": [{"visibility": "simplified"}]},
          {"featureType": "administrative","elementType": "geometry","stylers": [{"color": "#f2f2f2"}]},
//country borders color is next line
          {"featureType": "administrative", "elementType": "geometry.stroke", "stylers": [ { "color": "#ffffff" }, { "visibility": "on" } ] },
//main labels color is the next line
          { "featureType": "administrative", "elementType": "labels.text", "stylers": [ { "color": "#939393" } ] },
//urban land color is next line
          { "featureType": "landscape", "stylers": [ { "color": "#cccccc" } ] },
          { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [ { "color": "#334e87" } ] },
//main land color is the next line
          { "featureType": "landscape.natural", "stylers": [ { "color": "#d3e9d5" } ] },
          { "featureType": "poi", "stylers": [ { "visibility": "off" } ] },
          { "featureType": "poi", "elementType": "geometry", "stylers": [ { "color": "#283d6a" } ] },
          { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [ { "color": "#6f9ba5" } ] },
          { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [ { "color": "#1d2c4d" } ] },
//park areas color is next line
          { "featureType": "poi.park", "stylers": [ { "color": "#b8ddc3" }, { "visibility": "simplified" } ] },
          { "featureType": "poi.park", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },
          { "featureType": "poi.park", "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] },
//road color is the next line
          { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#f2f2f2" } ] },
          { "featureType": "road", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },
          { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#4e6d70" } ] },
          { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [ { "color": "#f2f2f2" } ] },
          { "featureType": "road.arterial", "stylers": [ { "visibility": "simplified" } ] },
          { "featureType": "road.arterial", "elementType": "geometry", "stylers": [ { "visibility": "simplified" } ] },
          { "featureType": "road.arterial", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },
          { "featureType": "road.highway", "stylers": [ { "visibility": "simplified" } ] },
          { "featureType": "road.highway", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },
          { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [ { "color": "#4e6d70" } ] },
          { "featureType": "road.highway", "elementType": "labels.text.stroke", "stylers": [ { "color": "#f2f2f2" } ] },
//transit lines and land area polygons are the next line
          { "featureType": "transit", "stylers": [ { "color": "#b2b2b2" } ] },
          { "featureType": "transit", "elementType": "labels", "stylers": [ { "visibility": "off" } ] },
          { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [ { "color": "#98d2b2" } ] },
          { "featureType": "transit", "elementType": "labels.text.stroke", "stylers": [ { "color": "#F2F2F2" } ] },
          { "featureType": "water", "stylers": [ { "color": "#b6d5e3" } ] },
          { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#4e6d70" } ] } ]});
      mapData.forEach(function (element) {
          if(element.lat){
              var contentString = getMapPopupContent(element);

              var infowindow = new google.maps.InfoWindow({
                  content: contentString
              });

              var position = {lat:element.lat, lng:element.lng};
              var marker = new google.maps.Marker({
                  position: position,
                  map: map,
                  animation: google.maps.Animation.DROP,
                  title: element.name,
                  icon: greyImage
              });
              marker.element = element;

              marker.addListener('click', function () {
                  infowindow.open(map, marker);
              });
              markers.push(marker);
          }
      });
  }


  function submitForm(){
      console.log("form submitted!");
  }

  function logOut(){
        document.cookie = 'session' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        location.reload(true);
  }
