// ==UserScript==
// @name         	WME HN Tool (JustinS83 fork)
// @description		Highlights un-nudged house numbers
// @version      	2019.05.03.01
// @author			SAR85/JustinS83
// @copyright		SAR85
// @license		 	CC BY-NC-ND
// @grant		 	none
// @include			https://www.waze.com/editor*
// @include			https://www.waze.com/*/editor*
// @include			https://beta.waze.com/*
// @exclude                     https://www.waze.com/user/editor*
// @require                     https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @namespace		https://greasyfork.org/users/30701-justins83-waze
// @contributionURL     https://github.com/WazeDev/Thank-The-Authors
// ==/UserScript==

/* global W */
/* global _ */
/* global $ */
/* global OL */
/* global require */
/* global WazeWrap */
/* eslint curly: ["warn", "multi-or-nest"] */

(function () {
    'use strict';
    var hnControl,
        hnControlPrototype,
        hnMarkerLayer,
        messageBar;
    var debug = false;
    var MultiAction, UpdateHouseNumberGeometry, settings;
    var stackedHNHighlightLayer;

    function saveSettings() {
        if (localStorage) {
            var localsettings = {HNAdjustVal: settings.HNAdjustVal};
            localStorage.setItem("hntool_Settings", JSON.stringify(localsettings));
        }
    }

    function loadSettings() {
        var loadedSettings = $.parseJSON(localStorage.getItem("hntool_Settings"));
        var defaultSettings = {
            HNAdjustVal: '',
        };
        settings = loadedSettings ? loadedSettings : defaultSettings;
        for (var prop in defaultSettings) {
            if (!settings.hasOwnProperty(prop))
                settings[prop] = defaultSettings[prop];
        }
    }

    /**
     * Changes the highlight status of an HN marker.
     * @param {Object} marker The HN marker to highlight.
     * @param {Boolean} highlight True to highlight, false to unhighlight.
     */
    function changeHighlight(marker, highlight) {
        //var color = highlight ? '#FFAD85' : 'white';
        if (marker) {
            marker.icon.$div.find('.uneditable-number').css('background-color', highlight);

            if(marker.inputWrapper)
                marker.inputWrapper.css('background-color', highlight);
        }
    }

    function highlightStackedHNs(){
        stackedHNHighlightLayer.removeAllFeatures();
        let clusters = [];
        _.each(hnMarkerLayer.markers, function(marker){
            if(clusters.length > 0){
                let added = false;
                for(let i=0;i<clusters.length; i++){
                    if(!added)
                        for(let k=0;k<clusters[i].length;k++){
                            if(Math.abs(parseInt($(clusters[i][k].icon.div).css('left').slice(0,-2)) - parseInt($(marker.icon.div).css('left').slice(0,-2))) <=2 && Math.abs(parseInt($(clusters[i][k].icon.div).css('top').slice(0,-2)) - parseInt($(marker.icon.div).css('top').slice(0,-2))) <=2){
                                //we are within 2 pixels of one of the cluster points, so add to that cluster
                                clusters[i].push(marker);
                                added = true;
                                break;
                            }
                        }
                }
                if(!added)
                    clusters.push([marker]);
            }
            else
                clusters.push([marker]);
        });
        let attributes = {
            name: ""
        };
        var radius = 1 + ((10-W.map.zoom) * 1) + (W.map.zoom <= 6 ? 3 : 0);
        _.each(clusters, function(cluster){
            if(cluster.length > 1){
                let centerpt = new OL.Geometry.Point(cluster[0].model.geometry.x, cluster[0].model.geometry.y);
                let style = {
                    strokeColor: '#FDA400', strokeOpacity: 1, strokeWidth: 5, fillColor: '#FDA400', fillOpacity: 1,
                    label: "", labelOutlineColor: "black", labelOutlineWidth: 3, fontSize: 14,
                    fontColor: "orange", fontOpacity: 1, fontWeight: "bold"};
                let poly = new OL.Geometry.Polygon.createRegularPolygon(centerpt, radius, 40, 0);
                let feature = new OL.Feature.Vector(poly, attributes, style);
                stackedHNHighlightLayer.addFeatures([feature]);
            }
        });
    }

    /**
     * Highlights never-edited house numbers.
     */
    function highlightUntouched(retryCount) {
        //console.log("HN Tool - highlightUntouched");
        var i, n, marker, hnMarkers;
		retryCount = retryCount || 0;
        hnMarkers = hnMarkerLayer.markers;
        if (hnMarkers.length === 0) {
            if (retryCount < 1000) {
                if(debug)
                    console.debug('HN Tool: HN Markers not found. Retry #' + (retryCount + 1));
                setTimeout(function () {highlightUntouched(++retryCount);}, 10);
                return;
            }
            else {
                console.debug('HN Tool: HN Markers not found. Giving up.');
                return;
            }
		}
		for (i = 0, n = hnMarkers.length; i < n; i++) {
			marker = hnMarkers[i];
            var color = 'white';
			if (marker.model && !marker.model.hasOwnProperty("updatedBy"))
                color = '#FFAD85';
            else if (marker.model && marker.model.updatedBy === W.loginManager.user.id)
                color = '#85ffad';

            changeHighlight(marker, color);
            }
		}

    /**
     * Checks for the presence of the HN map layer.
     */
	function checkForHNLayer() {
		var layers = W.map.getLayersByName('houseNumberMarkers');
		if (layers.length > 0) {
			hnMarkerLayer = layers[0];
			highlightUntouched();
            setTimeout(highlightStackedHNs, 750);
		}
    }

    function delayedCheckForHNLayer(){
        setTimeout(checkForHNLayer, 1500);
    }

    /**
     * Stores version and changes info and alerts user.
     */
	function updateAlert() {
		var hnVersion = GM_info.script.version,
			alertOnUpdate = true,
            versionChanges = `WME Highlight HNs has been updated to ${hnVersion}.\n`;

        versionChanges += 'Changes:\n';
        versionChanges += '[*] Fixing unnudged highlighting';

        if (alertOnUpdate && window.localStorage &&
            window.localStorage.hnVersion !== hnVersion) {
			window.localStorage.hnVersion = hnVersion;
            if(WazeWrap.User.Rank() > 3)
                alert(versionChanges);
		}
    }

    function toggleInterface(){
        if(W.editingMediator.attributes.editingHouseNumbers){
            checkForHNLayer();
            loadSettings();

            W.model.actionManager.events.unregister("afterundoaction",null, checkForHNLayer);
            W.model.actionManager.events.unregister("afterclearactions",null, delayedCheckForHNLayer);
            W.model.actionManager.events.unregister("afteraction",null, checkForHNLayer);
            W.model.actionManager.events.unregister("noActions", null, checkForHNLayer);

            W.model.actionManager.events.register("afterundoaction",null, checkForHNLayer);
            W.model.actionManager.events.register("afterclearactions",null, delayedCheckForHNLayer);
            W.model.actionManager.events.register("afteraction",null, checkForHNLayer);
            W.model.actionManager.events.register("noActions", null, checkForHNLayer);
            W.map.events.register("zoomend", null, highlightStackedHNs);

            if(WazeWrap.User.Rank() > 3){
                var $HNToolClearHNs = $("<div>");
                $HNToolClearHNs.html([
                    '<div id="HNToolClearHNsDiv" class="toolbar-button" title="Clear house numbers" style="float:left;">',
                    '<span id="HNToolClearHNsButton"><i class="fa fa-times-circle" style="color:red;" aria-hidden="true"></i> Clear HNs</span>',
                    '</div>'
                ].join(' '));
                $('.add-house-number').before($HNToolClearHNs.html());
                $('#HNToolClearHNsButton').click(clearHNs);

                var $HNToolAdjustHNs = $("<div>");
                $HNToolAdjustHNs.html([
                    '<div id="HNToolAdjustHNsDiv" class="toolbar-button" title="The amount to adjust all existing house numbers on this segment" style="float:left;">',
                    '<span id="HNToolAdjustHNsButton"><i class="fa fa-magic" aria-hidden="true"></i> Adjust HNs</span>',
                    '<input type="text" id="HNToolHNAdjustAmount" style="height:20px;; width: 64px; text-align: right">',
                    '</div>'
                ].join(' '));
                $('.add-house-number').before($HNToolAdjustHNs.html());
                $('#HNToolAdjustHNsButton').click(updateHNs);

                $('#HNToolHNAdjustAmount')[0].value = settings.HNAdjustVal;
                $('#HNToolHNAdjustAmount').blur(function(){
                    settings.HNAdjustVal = $('#HNToolHNAdjustAmount')[0].value;
                    saveSettings();
                });
            }
        }
        else{
            stackedHNHighlightLayer.removeAllFeatures();
            W.model.actionManager.events.unregister("afterundoaction",null, checkForHNLayer);
            W.model.actionManager.events.unregister("afterclearactions",null, delayedCheckForHNLayer);
            W.model.actionManager.events.unregister("afteraction",null, checkForHNLayer);
            W.model.actionManager.events.unregister("noActions", null, checkForHNLayer);
            W.map.events.unregister("zoomend", null, highlightStackedHNs);
        }
    }

    function updateHNs(){
        let UpdateHN = require("Waze/Action/UpdateHouseNumber");
        let currMarker;

        let markerCount = W.map.getLayersByName('houseNumberMarkers')[0].markers.length;

        let strval = $('#HNToolHNAdjustAmount')[0].value.trim(); //that value by which to modify the existing HNs
        if(strval.match(/^[*\/+-]?[1-9]\d*$/)){
            let operator = '+'; //default the modification to addition if no operator is present

            if(strval.charAt(0).match(/[*\/+-]/))
                operator = strval.charAt(0);

            let val = parseInt(strval.replace(operator,""));
            for(let i=markerCount-1; i>-1; i--){
                var updateObject = {forced: false, number:'', valid:true};
                currMarker = W.map.getLayersByName('houseNumberMarkers')[0].markers[i];

                let currHN = parseInt(currMarker.model.number);
                if(WazeWrap.Geometry.isLonLatInMapExtent(currMarker.lonlat)){
                    var multiaction = new MultiAction();
                    multiaction.setModel(W.model);
                    if(operator === '+')
                        updateObject.number = currHN + val;
                    else if(operator === '-')
                        updateObject.number = currHN - val;
                    else if(operator === '*')
                        updateObject.number = currHN * val;
                    else
                        updateObject.number = currHN / val;
                    updateObject.number = updateObject.number.toString();

                    if (currMarker.model.updatedBy === null) {
                        var newGeometry = currMarker.model.geometry.clone();
                        newGeometry.x += 0.000000001;
                        multiaction.doSubAction(new UpdateHouseNumberGeometry(currMarker.model, newGeometry, currMarker.model.fractionPoint, currMarker.model.segID));
                    }
                    W.model.actionManager.add(multiaction);
                }
            }
        }
        else
            alert("Please enter the HN adjustment amount in the correct format");
    }

    function clearHNs(){
        let DeleteHouseNumber = require('Waze/Actions/DeleteHouseNumber');
        let currMarker;
        let markerCount = W.map.getLayersByName('houseNumberMarkers')[0].markers.length;
        for(let i=markerCount-1; i>-1; i--){
            currMarker = W.map.getLayersByName('houseNumberMarkers')[0].markers[i];
            W.model.actionManager.add(new DeleteHouseNumber(currMarker.model));
        }
    }

    /**
     * Initializes the script variables.
     */
    var saving = false;
    function hnInit() {
        var segmentEditor = window.require('Waze/Feature/Vector/Segment');

        MultiAction = require('Waze/Action/MultiAction');
        UpdateHouseNumberGeometry = require('Waze/Action/MoveHouseNumber');
        W.editingMediator.on('change:editingHouseNumbers', toggleInterface);

        /*
		messageBar = new wLib.Interface.MessageBar({
			messagePrefix: 'WME HN Tool:'
        });
        */
        stackedHNHighlightLayer = new OL.Layer.Vector("HNToolStackedHNs",{displayInLayerSwitcher: false,uniqueName: "__HNToolStackedHNs"});
        W.map.addLayer(stackedHNHighlightLayer);
        stackedHNHighlightLayer.setVisibility(true);
        stackedHNHighlightLayer.setOpacity(0.6);

		console.debug('HN Tool: Initialized.');
		updateAlert();
    }

    /**
     * Checks for necessary DOM and WME elements before initialization.
     */
    function hnBootstrap(count) {
        count = count || 0;

        if (W &&
            W.map &&
            W.map.events &&
            W.map.events.register &&
            W.loginManager &&
            W.loginManager.user &&
            require && WazeWrap.Ready) {
            console.debug('HN Tool: Initializing...');
            hnInit();

		} else if (count < 10) {
			console.debug('HN Tool: Bootstrap failed. Trying again...');
			setTimeout(function () {hnBootstrap(++count);}, 1000);
		} else
			console.error('HN Tool: Bootstrap error.');
    }

	console.debug('HN Tool: Bootstrap...');
    hnBootstrap();
} ());
