import React from 'react'
import ResizeDetector from 'react-resize-detector'
import invariant from 'invariant'
import debug from 'debug'
import { pick, isEmpty, debounce } from 'lodash'
import uuid from 'uuid/v4'

import createLogger from '../utils/createLogger'
import compose from '../utils/compose'
import withNavermaps from '../withNavermaps'
import withNaverEvents from '../withNaverEvents'

const pickMapOptions = obj => pick(obj, [
  'background',
  'baseTileOpacity',
  'disableDoubleClickZoom',
  'disableDoubleTapZoom',
  'disableKineticPan',
  'disableTwoFingerTapZoom',
  'draggable',
  'keyboardShortcuts',
  'logoControl',
  'logoControlOptions',
  'mapDataControl',
  'mapDataControlOptions',
  'mapTypeControl',
  'mapTypeControlOptions',
  'mapTypes',
  'maxBounds',
  'maxZoom',
  'minZoom',
  'padding',
  'pinchZoom',
  'resizeOrigin',
  'scaleControl',
  'scaleControlOptions',
  'scrollWheel',
  'overlayZoomEffect',
  'tileSpare',
  'tileTransition',
  'zoomControl',
  'zoomControlOptions',
  'zoomOrigin',
])

 /**
  * mount
  * 
  * render dom
  * create instance (component did mount) - check overscrolling, clear updating
  * 
  * addListener (component did update)
  * update instance (component did update) - fire updating, block when updating
  * 
  * 
  * destroy instance (component will unmount)
  * 
  * unmount
  */
 
const log = createLogger('Map');

class MapDOM extends React.Component  {
  constructor (props) {
    super(props);

    this.handleResize = this.handleResize.bind(this);
  }

  handleResize (width, height) {
    const { instance } = this.props;

    // resize map on wrapping div resized
    if (instance) {
      instance.setSize({
        width, height
      })
    }
  }

  render () {
    const { id, className, mapDivId, children, instance } = this.props;

    return (
      <div id={id} className={className}>
        <div id={mapDivId} style={{ width: "100%", height: "100%" }}/>
        <ResizeDetector handleWidth handleHeight onResize={this.handleResize}/>
        {children}
      </div>
    )
  }
};

const defaultProps = {
  mapDivId: 'naver-map',
  zoomEffect: false,

  // size,
  // bounds,
  // center,
  // zoom,
  // mapTypeId,

  // background,
  // baseTileOpacity,
  // disableDoubleClickZoom,
  // disableDoubleTapZoom,
  // disableKineticPan,
  // disableTwoFingerTapZoom,
  // draggable,
  // keyboardShortcuts,
  // logoControl,
  // logoControlOptions,
  // mapDataControl,
  // mapDataControlOptions,
  // mapTypeControl,
  // mapTypeControlOptions,
  // mapTypes,
  // maxBounds,
  // maxZoom,
  // minZoom,
  // padding,
  // pinchZoom,
  // resizeOrigin,
  // scaleControl,
  // scaleControlOptions,
  // scrollWheel,
  // overlayZoomEffect,
  // tileSpare,
  // tileTransition,
  // zoomControl,
  // zoomControlOptions,
  // zoomOrigin,
}

const withNaverMapInstance = WrappedComponent => {
  class MapInstance extends React.PureComponent {
    constructor (props) {
      super(props);

      // while updating = true, update are banned 
      // until idle or new panning, zooming start
      this.updating = false;
      this.reupdateTimeout = 0;

      // to check overScrolling bug
      this.scrolling = false;
      this.scrollingEndTimeout = 0;

      this.handleCenterChanged = this.handleCenterChanged.bind(this);
      this.handleBoundsChanged = this.handleBoundsChanged.bind(this);

      this.updateMapInstance = debounce(this.updateMapInstance, 0)
    }

    // clear updating state.
    clearUpdating () {

      // log('UPDATING CLEAR')
      clearTimeout(this.reupdateTimeout);
      this.updating = false;
    }

    // create map instance
    createMapInstance () {
      log('MAP INSTANCE %cCREATE', 'background: black; color: red;')

      const {
        navermaps, 

        // TODO: change to lodash.pick
        center,
        zoom,
        mapTypeId,
        size,
        bounds,
        
        mapDivId
      } = this.props;
      
      // create navermap instance
      const mapOptions = {};
  
      if (center) { mapOptions.center = center }
      if (zoom) { mapOptions.zoom = zoom }
      if (mapTypeId) { mapOptions.mapTypeId = mapTypeId }
      if (size) { mapOptions.size = size }
      if (bounds) { mapOptions.bounds = bounds }
  
      this.map = new navermaps.Map(mapDivId, mapOptions);
      invariant(this.map, 'naver.maps.Map instance creation failure') 
  
      // there is a macos inertial scroll bug. 
      // check user scrolling
      // scroll event occur on mavdivId > div > div
      const scrollDiv = document.querySelector(`#${mapDivId} > div > div`)
  
      if (scrollDiv) {
        scrollDiv.addEventListener('mousewheel', (e) => {
          
          // clear the timeout trying to set flag false
          clearTimeout(this.scrollingEndTimeout);
  
          // set overscolling flag true
          this.scrolling = true
  
          // try to set the flag false
          this.scrollingEndTimeout = setTimeout(() => {
            this.scrolling = false;
  
            // provide blocking when overscroll during panning.
            if (this.updating) {
              
              this.clearUpdating();
              this.forceUpdate();
            }
          }, 50)
        }, false)
      }
  
      // whenever user zoom during 'updating', unblock updating.
      this.map.addListener('zooming', () => {
  
        // log('%cZOOMING!', 'background: #222; color: #bada55');
        this.clearUpdating();
      })
  
      // whenever update finish, unblock updating.
      this.map.addListener('idle', () => {
  
        // log('%cIDLE!', 'background: #222; color: #bada55');
        this.clearUpdating();
      })
    }
  
    updateMapInstance () {
      // log ("updateInstance");
  
      const { 
        zoomEffect, 
        transitionOptions,

        zoom,
        center,
      } = this.props;
  
      // panning issue
      //
      // issue: macos inertial scrolling cause panTo bug when try to zoom > 14
      // pending update until scrolling is over.
      
      // clear reupdateTimeout first
      clearTimeout(this.reupdateTimeout);
      
      // retry update.
      if (
        // bug condition.
        (this.props.zoom === 14 && this.scrolling)
  
        // // is updating
        || this.updating
      ) {
  
        // blocking update
        // log('updateInstance RETRY');

        // retry after timeout 
        this.reupdateTimeout = setTimeout(() => {
          this.forceUpdate();
        }, 50)
  
        return;
      } 
  
      // update
      // log('updateInstance UPDATE!')

      // setting properties issue
      //
      // issue 1: setZoom and panTo can not be executed in parallel. 
      // issue 2: morph clear view before move. 
      // issue 3: zooming bug with morph 
      // (repeat zoom in and out with debounce. morph always take times because of animation)
      //
      // zoom first to avoid issue 1
  
      // set zoom if need
      if (zoom !== this.map.getZoom()) {
  
        // log('UPDATE ZOOM', this.map.getZoom(), zoom)
        this.updating = true;
        this.map.setZoom(zoom, zoomEffect);
      }
        
      // set center
      if (center && !center.equals(this.map.getCenter())) {
  
        // log('updateInstance UPDATE %cCENTER', 'background: #222; color: red', this.map.getCenter(), center)
        this.updating = true;
        this.map.panTo(center, transitionOptions);
      }
  
      // // set else this.map options
      // const mapOptions = pickMapOptions(this.props);
  
      // // TODO: deep check mapOptions 
      // if (!isEmpty(mapOptions)) {
  
      //   this.map.setOptions(mapOptions);
      // }
    }
  
    destroyMapInstance () {
      // log('KVO INSTANCE %cDESTROY', 'background: black; color: red;')
      this.map.destroy();
    }

    // proxy onCenterChanged. for blocking when update.
    handleCenterChanged (...args) {
      const center = args[0];

      // const {
      //   navermaps
      // } = this.props;
  
      // log('handleCenterChagned');
      // new navermaps.Marker({
      //   position: center.clone(),
      //   map: this.map
      // })
      
      if (!this.updating) this.props.onCenterChanged(...args)
    }

    // proxy onBoundsChanged for blocking when update.
    handleBoundsChanged (...args) {

      if (!this.updating) this.props.onBoundsChanged(...args)
    }

    render () {
      const {
        children
      } = this.props;

      return (
        <WrappedComponent 
          {...this.props} 
          instance={this.map}
          onCenterChanged={this.props.onCenterChanged && this.handleCenterChanged}
          onBoundsChanged={this.props.onBoundsChanged && this.handleBoundsChanged}
        >
          {/* render empty Children(Overlay, Control, etc) */}
          {this.map && React.Children.map(children, (child) => {
            return React.cloneElement(child, { map: this.map, key: child.key || uuid() });
          })}
        </WrappedComponent>
      )
    }

    componentDidMount () {
  
      this.createMapInstance();

      // update after create instance for mount children.
      this.forceUpdate();
    }

    componentDidUpdate () {

      this.updateMapInstance();
    }

    componentWillUnmount () {
      
      if (this.map) this.destroyMapInstance();
    }
  }

  // MapInstance component default props
  MapInstance.defaultProps = {
    naverEventNames: [
      'addLayer',
      'click',
      'dblclick',
      'doubletap',
      'drag',
      'dragend',
      'dragstart',
      'idle',
      'keydown',
      'keyup',
      'longtap',
      'mousedown',
      'mousemove',
      'mouseout',
      'mouseover',
      'mouseup',
      'panning',
      'pinch',
      'pinchend',
      'pinchstart',
      'removeLayer',
      'resize',
      'rightclick',
      'tap',
      'tilesloaded',
      'touchend',
      'touchmove',
      'touchstart',
      'twofingertap',
      'zooming',
      'mapType_changed',
      'mapTypeId_changed',
      'size_changed',
      'bounds_changed',
      'center_changed',
      'centerPoint_changed',
      'projection_changed',
      'zoom_changed',
    ],
    zoomEffect: false,
  }

  const name = WrappedComponent.displayName || WrappedComponent.name;
  MapInstance.displayName = `withNaverMapInstance(${name})`;

  return MapInstance;
}

const Composed = compose(
  withNavermaps(),
  withNaverMapInstance,
  withNaverEvents,
)(MapDOM)

Composed.defaultProps = defaultProps;

export default Composed;