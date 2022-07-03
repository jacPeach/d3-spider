// Variables
async function createMap() {
  // const stations = await d3.json("./data/translink-nir-rail-stations.txt");
  const stations = await d3.json("./data/osm-rail-stations-names.geojson");

  // Draw and update spokes each time the map pans
  const pan = () => {
    let center = map.getCenter();
    pxCenter = map.latLngToLayerPoint(center);
    let points = knn(
      [center.lat, center.lng],
      stations.features,
      kSelect.property("value")
    );
    centerDot.attr("cx", pxCenter.x).attr("cy", pxCenter.y);

    const lines = svg
      .selectAll("path")
      .data(points)
      .join("path")
      .attr("class", "line")
      .attr("d", (d) =>
        linePath([[center.lng, center.lat], d.geometry.coordinates])
      )
      .lower();
  };

  // Rescale the dots each time the map is zoomed
  const onZoom = () => {
    dots
      .attr(
        "cx",
        (d) =>
          map.latLngToLayerPoint([
            d.geometry.coordinates[1],
            d.geometry.coordinates[0],
          ]).x
      )
      .attr(
        "cy",
        (d) =>
          map.latLngToLayerPoint([
            d.geometry.coordinates[1],
            d.geometry.coordinates[0],
          ]).y
      );
    // onReset();
  };

  // Setup the options for k nearest neighbours
  const ks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const kSelect = d3.select("#k-val").on("change", pan);
  var options = kSelect
    .selectAll("option")
    .data(ks)
    .enter()
    .append("option")
    .text(function (d) {
      return d;
    })
    .property("selected", (d) => d === 10);

  // Build the map
  var map = L.map("map").setView([52.117548, -1.149316], 8);
  let osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }
  ).addTo(map);
  L.svg({ clickable: true }).addTo(map);

  // Create an SVG overlay layer
  const overlay = d3.select(map.getPanes().overlayPane);
  const svg = overlay.select("svg").attr("pointer-events", "auto");
  const dotG = svg.append("g").attr("id", "destinations");
  const label = d3.select("#selected-dest");
  // const g = svg.select("g");

  // // Function called each time the SVG bounds need recalculating
  // function onReset() {
  //   //Setup a method for calculating the required bounds of the SVG - https://bost.ocks.org/mike/leaflet/
  //   function projectPoint(x, y) {
  //     var point = map.latLngToLayerPoint(new L.LatLng(y, x));
  //     this.stream.point(point.x, point.y);
  //   }
  //   var transform = d3.geoTransform({ point: projectPoint }),
  //     path = d3.geoPath().projection(transform);
  //   console.log("reset");
  //   var bounds = path.bounds(stations),
  //     topLeft = bounds[0],
  //     bottomRight = bounds[1];
  //   console.log(bounds);
  //   svg
  //     .attr("width", bottomRight[0] - topLeft[0])
  //     .attr("height", bottomRight[1] - topLeft[1])
  //     .style("left", topLeft[0] + "px")
  //     .style("top", topLeft[1] + "px");

  //   dotG.attr(
  //     "transform",
  //     "translate(" + -topLeft[0] + "," + -topLeft[1] + ")"
  //   );
  // }

  // onReset();

  const dots = dotG
    .selectAll("circle")
    .data(stations.features)
    .join("circle")
    .attr("class", "destination")
    .attr("fill", "steelblue")
    .attr("stroke", "black")
    .attr("r", 5)
    .attr(
      "cx",
      (d) =>
        map.latLngToLayerPoint([
          d.geometry.coordinates[1],
          d.geometry.coordinates[0],
        ]).x
    )
    .attr(
      "cy",
      (d) =>
        map.latLngToLayerPoint([
          d.geometry.coordinates[1],
          d.geometry.coordinates[0],
        ]).y
    )
    .on("mouseenter", (e, d) => {
      const name = d.properties.name;
      if (name === null) label.text("Unknown");
      else {
        label.text("Destination: " + d.properties.name);
      }
      d3.select(e.target).transition().duration(250).attr("r", 7);
    })
    .on("mouseleave", (e, d) => {
      label.text("Hover a point to see the name");
      d3.select(e.target).transition().duration(250).attr("r", 5);
    });

  // Draw a dot in the center - the hub for any spokes
  let pxCenter = map.latLngToLayerPoint(map.getCenter());
  const centerDot = svg
    .append("circle")
    .attr("class", "origin")
    .attr("fill", "black")
    .attr("stroke", "black")
    .attr("cx", pxCenter.x)
    .attr("cy", pxCenter.y)
    .attr("r", 5);

  var linePath = d3
    .line()
    .x(function (d) {
      return map.latLngToLayerPoint(new L.LatLng(d[1], d[0])).x;
    })
    .y(function (d) {
      return map.latLngToLayerPoint(new L.LatLng(d[1], d[0])).y;
    });

  map.on("zoomend", onZoom);
  map.on("move", pan);
  // map.on("viewreset", onReset);

  pan();
}

// Gets the k-nearest points to an origin
function knn(o, points, k) {
  let nn = haversine(
    o[0],
    points[0].geometry.coordinates[1],
    o[1],
    points[0].geometry.coordinates[0]
  );
  let ps = points[0];
  let d = [{ p: ps, dis: nn }];
  for (let i = 1; i < points.length; i++) {
    let ans = haversine(
      o[0],
      points[i].geometry.coordinates[1],
      o[1],
      points[i].geometry.coordinates[0]
    );
    d.push({ p: points[i], dis: ans });
  }
  d.sort((a, b) => a.dis - b.dis);
  return d.map((x) => x.p).slice(0, k);
}

// Convert to radians
function toRad(Value) {
  return (Value * Math.PI) / 180;
}
// Haversine distance
function haversine(lat1, lat2, lng1, lng2) {
  rad = 6372.8; // for km Use 3961 for miles
  deltaLat = toRad(lat2 - lat1);
  deltaLng = toRad(lng2 - lng1);
  lat1 = toRad(lat1);
  lat2 = toRad(lat2);
  a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return rad * c;
}

createMap();
