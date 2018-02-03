

  var markers = [];
  var greyImage;
  var blueImage;
  var greenImage;
  var yellowImage;
  var lightOrangeImage;
  var orangeImage;

  var currentActiveHighlightingButton;



function filter(value, filterBy, type){

  if(type == "select"){
    filterValues(value, filterBy);
  } else if (type == "range"){
    filterRange(value, filterBy);
  } else {
    console.log("Unexpected filter type: " + type);
  }

};

function filterValues(value, filterBy){
  markers.forEach(function (marker) {
      marker.setVisible(marker.element[filterBy] == value);
  });
}

function filterRange(value, filterBy){
  var upper;
  var lower;
  var values = value.split("–");
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
      marker.setVisible(marker.element[filterBy] > lower && marker.element[filterBy] < upper);
  });
}

//TODO: filters need to remember all active filtering, not just latest

function selectHighlight(filterBy, node){
  highlightValues(filterBy);
  if(currentActiveHighlightingButton != null){
    currentActiveHighlightingButton.classList.remove("activeButton");
  }
  currentActiveHighlightingButton = node;
  node.classList.add("activeButton");
}


function highlightValues(filterBy){
  markers.forEach(function (marker) {
      if(marker.element[filterBy] != null){
          marker.setIcon(orangeImage);
      } else {
          marker.setIcon(greyImage);
      }
  });
}

//UI

function togglePanelOpenOrClosed(panelId){
  var panel = document.getElementById(panelId);
  var status = panel.classList.contains("hide");
  if(status){
    panel.classList.remove("hide");
  } else {
      panel.classList.add("hide");
  }
}

function closeAllPanels(){
  var panels = document.getElementsByClassName("mapInfoContent");
  for(let i = 0; i < panels.length; i++){
    panels[i].classList.add("hide");

  }
}

//FILTER

  function filterNotNull(filterBy) {
      markers.forEach(function (marker) {
          if(marker.element[filterBy] != null){
              marker.setIcon(orangeImage);
          } else {
              marker.setIcon(greyImage);
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
  };

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
              var contentString =
                  '<div id="content">' +
                      '<div id="siteNotice">' +
                      '</div>' +
                      '<div style="font-weight:bold; font-size:20px;">' + element.title + '</div>' +
                      '<div id="bodyContent">' +
                      (element.scale  !== null ?  '<div">' + element.scale + '</div>' : "") +

                      (element.biodiversity_url  !== null ?  '<div><a href="' + element.biodiversity_url + 'rel="noopener noreferrer" target="_blank"">Main link</a></div>' : "") +

                      (element.intplan_title  !== null ?  '<p>' + (element.intplan_year !== null ? element.intplan_year : "") + ' ' + element.intplan_title + " " : "") +
                      (element.intplan_url  !== null ?  '<a href="' + element.intplan_url + 'rel="noopener noreferrer" target="_blank"">link</a></p>' : "</p>") +

                      (element.plan1_title !== null ? '<p>' + (element.plan1_year !== null ? element.plan1_year : "") + ' ' + element.plan1_title + " " : "") +
                      (element.plan1_url !== null ? '<a href="' + element.plan1_url + 'rel="noopener noreferrer" target="_blank"">link</a></p>' : "</p>") +

                      (element.plan2_title !== null ? '<p>' + (element.plan2_year !== null ? element.plan2_year : "") + ' ' + element.plan2_title + " " : "") +
                      (element.plan2_url !== null ? '<a href="' + element.plan2_url + 'rel="noopener noreferrer" target="_blank"">link</a></p>' : "</p>") +

                      (element.report_title !== null ? '<p>' + (element.report_year !== null ? element.report_year : "") + ' ' + element.report_title + " " : "") +
                      (element.report_url !== null ? '<a href="' + element.report_url + 'rel="noopener noreferrer" target="_blank"">link</a></p>' : "</p>") +

                      (element.extra1_title !== null ? '<p>' + element.extra1_title + ' ' : "") +
                      (element.extra1_url !== null ? '<a href="' + element.extra1_url + 'rel="noopener noreferrer" target="_blank"">link</a></p>' : "</p>") +

                      (element.extra2_title !== null ? '<p>' + element.extra2_title + ' ': "") +
                      (element.extra2_url !== null && typeof extra2_url !== "undefined" ? '<a href="' + element.extra2_url + 'rel="noopener noreferrer" target="_blank"">link</a></p>' : "</p>") +

                      (element.EF_data_ghapercap !== null ? '<p>' + (element.EF_year !== null ? element.EF_year : "") + ' Ecological Footprint ' + element.EF_data_ghapercap + "gha/cap " : "") +
                      (element.EF_link !== null ? '<a href="' + element.EF_link + 'rel="noopener noreferrer" target="_blank"">source</a></p>' : "</p>") +


                      '</div>' +
                  '</div>';

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
