function logOut(){
      document.cookie = 'session' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      console.log("logout");
      location.reload(true);
  }
  var markers = [];
  var yellowImage;
  var greenImage;
  var orangeImage;
  function filter(value, filterBy){
      markers.forEach(function (marker) {
          marker.setVisible(marker.element[filterBy] == value);
      });
  };

//UI

function togglePanelOpen(panelId){
  closeAllPanels();
  var panel = document.getElementById(panelId);
  var status = panel.classList.contains("hide");
  if(status){
    panel.classList.remove("hide");
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
              marker.setZIndex(2);
          } else {
              marker.setIcon(greenImage);
              marker.setZIndex(1);
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
              marker.setZIndex(2);
          } else {
              marker.setIcon(greenImage);
              marker.setZIndex(1);
          }
      });
  };

  function resetFilter(){
      markers.forEach(function (marker) {
          marker.setVisible(true);
          marker.setIcon(yellowImage);
      });
  };

  function initMap (mapData) {
      yellowImage = {
          url: '/images/marker-yellow-det.png',
          size: new google.maps.Size(14, 46),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(12, 46)
      };
      greenImage = {
          url: '/images/marker-green-det.png',
          size: new google.maps.Size(14, 46),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(12, 46)
      };
      orangeImage = {
          url: '/images/marker-orange-det.png',
          size: new google.maps.Size(14, 46),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(12, 46)
      };
      //var mapData =!{mapData};
      center = {lat: 20, lng: 15};
      var map = new google.maps.Map(document.getElementById('map'), {
          zoom: 2,
          center: center,
          styles: [{"elementType": "geometry","stylers": [{"color": "#1d2c4d"}]}, {"elementType": "labels.text.fill","stylers": [{"color": "#8ec3b9"}]},{"elementType": "labels.text.stroke","stylers": [ { "color": "#1a3646" } ]},{"featureType": "administrative","stylers": [{"visibility": "simplified"}]},{"featureType": "administrative","elementType": "geometry","stylers": [{"color": "#6ab285"}]},{"featureType": "administrative", "elementType": "geometry.stroke", "stylers": [ { "color": "#d7e9cd" }, { "visibility": "on" } ] }, { "featureType": "administrative", "elementType": "labels.text", "stylers": [ { "color": "#d6e9cd" } ] }, { "featureType": "landscape", "stylers": [ { "color": "#3d7761" } ] }, { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [ { "color": "#334e87" } ] }, { "featureType": "landscape.natural", "stylers": [ { "color": "#298f6a" } ] }, { "featureType": "poi", "stylers": [ { "visibility": "off" } ] }, { "featureType": "poi", "elementType": "geometry", "stylers": [ { "color": "#283d6a" } ] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [ { "color": "#6f9ba5" } ] }, { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [ { "color": "#1d2c4d" } ] }, { "featureType": "poi.park", "stylers": [ { "color": "#6ab285" }, { "visibility": "simplified" } ] }, { "featureType": "poi.park", "elementType": "labels", "stylers": [ { "visibility": "off" } ] }, { "featureType": "poi.park", "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] }, { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#2d1b5a" } ] }, { "featureType": "road", "elementType": "labels", "stylers": [ { "visibility": "off" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#98a5be" } ] }, { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [ { "color": "#1d2c4d" } ] }, { "featureType": "road.arterial", "stylers": [ { "visibility": "simplified" } ] }, { "featureType": "road.arterial", "elementType": "geometry", "stylers": [ { "visibility": "simplified" } ] }, { "featureType": "road.arterial", "elementType": "labels", "stylers": [ { "visibility": "off" } ] }, { "featureType": "road.highway", "stylers": [ { "visibility": "simplified" } ] }, { "featureType": "road.highway", "elementType": "labels", "stylers": [ { "visibility": "off" } ] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [ { "color": "#b0d5ce" } ] }, { "featureType": "road.highway", "elementType": "labels.text.stroke", "stylers": [ { "color": "#023e58" } ] }, { "featureType": "transit", "stylers": [ { "color": "#00907d" } ] }, { "featureType": "transit", "elementType": "labels", "stylers": [ { "visibility": "off" } ] }, { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [ { "color": "#98a5be" } ] }, { "featureType": "transit", "elementType": "labels.text.stroke", "stylers": [ { "color": "#1d2c4d" } ] }, { "featureType": "water", "stylers": [ { "color": "#193c59" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#4e6d70" } ] } ]});
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
                  icon: yellowImage, //'/images/marker-yellow-det.png',
                  zIndex: 1
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
