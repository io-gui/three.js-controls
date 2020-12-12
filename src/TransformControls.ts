import { Mesh, MeshBasicMaterial, Object3D, Quaternion, Vector3, Color, Matrix4, Plane, Intersection } from 'three';

import { PointerTracker } from './core/Pointers';
import { EVENT, UNIT } from './core/Base';

import { Controls } from './core/Controls';
import { TransformHelper } from './TransformHelper';
export { TransformHelper } from './TransformHelper';

export const TRANSFORM_CHANGE_EVENT = { type: 'transform-changed' };

function getFirstIntersection(intersections: Intersection[], includeInvisible: boolean ): Intersection | null {
  for ( let i = 0; i < intersections.length; i ++ ) {
    if ( intersections[ i ].object.visible || includeInvisible ) {
      return intersections[ i ];
    }
  }
  return null;
}

class TransformControls extends Controls {
  static readonly isTransformControls = true;
  static readonly type = 'TransformControls';

  // TransformHelper API

  size = 1;
  showX = true;
  showY = true;
  showZ = true;
  showTranslate = true;
  showRotate = true;
  showScale = true;

  // TransformControls API

  object?: Object3D;

  dragging = false;
  active = false;
  space = 'world';
  activeMode: 'translate' | 'rotate' | 'scale' | '' = '';
  activeAxis: 'X' | 'Y' | 'Z' | 'XY' | 'YZ' | 'XZ' | 'XYZ' | 'XYZE' | 'XYZX' | 'XYZY' | 'XYZZ' | 'E' | '' = '';
  translationSnap = 0;
  rotationSnap = 0;
  scaleSnap = 0;
  minGrazingAngle = 30;

  FADE_EPS = 0.001;
  FADE_FACTOR = 0.15;

  private readonly _pointStart = new Vector3();
  private readonly _pointEnd = new Vector3();
  private readonly _offset = new Vector3();
  private readonly _startNorm = new Vector3();
  private readonly _endNorm = new Vector3();

  private readonly _transformMatrixStart = new Matrix4();
  private readonly _transformMatrixEnd = new Matrix4();
  private readonly _trandformMatrixOffset = new Matrix4();

  private readonly _parentWorldPosition = new Vector3();
  private readonly _parentWorldQuaternion = new Quaternion();
  private readonly _parentWorldQuaternionInv = new Quaternion();
  private readonly _parentWorldScale = new Vector3();

  private readonly _objectWorldPositionStart = new Vector3();
  private readonly _objectWorldQuaternionStart = new Quaternion();
  private readonly _objectWorldScaleStart = new Vector3();

  private readonly _objectWorldPosition = new Vector3();
  private readonly _objectWorldQuaternion = new Quaternion();
  private readonly _objectWorldQuaternionInv = new Quaternion();
  private readonly _objectWorldScale = new Vector3();

  private readonly _objectPositionStart = new Vector3();
  private readonly _objectQuaternionStart = new Quaternion();
  private readonly _objectQuaternionStartInv = new Quaternion();
  private readonly _objectScaleStart = new Vector3();

  private readonly _rotationAxis = new Vector3();
  private _rotationAngle = 0;

  private readonly _tempVector = new Vector3();
  private readonly _tempQuaternion = new Quaternion();
  private readonly _targetColor = new Color();
  private readonly _dirX = new Vector3( 1, 0, 0 );
  private readonly _dirY = new Vector3( 0, 1, 0 );
  private readonly _dirZ = new Vector3( 0, 0, 1 );
  private readonly _dirVector = new Vector3();
  private readonly _identityQuaternion = Object.freeze( new Quaternion() );

  // TODO: improve
  private _helper = new TransformHelper();
  protected readonly _plane = new Plane();

  constructor () {
    super();

    this.add( this._helper );

    /* eslint-disable @typescript-eslint/no-use-before-define */

    // Define properties with getters/setter
    // Setting the defined property will automatically trigger change event

    this.observeProperty( 'object' );
    this.observeProperty( 'activeAxis' );
    this.observeProperty( 'activeMode' );
    this.observeProperty( 'space', );
    this.observeProperty( 'size' );
    this.observeProperty( 'active' );
    this.observeProperty( 'dragging' );
    this.observeProperty( 'showX' );
    this.observeProperty( 'showY' );
    this.observeProperty( 'showZ' );
    this.observeProperty( 'showTranslate' );
    this.observeProperty( 'showRotate' );
    this.observeProperty( 'showScale' );

    // Deprecation warnings
    Object.defineProperty( this, 'mode', {
      set: () => {
        console.warn( 'THREE.TransformControls: "mode" has been deprecated. Use showTranslate, showScale and showRotate.' );
      }
    });
  }
  updateHandleMaterial( handle: Mesh ): void {
    const handleType = handle.userData.type;
    const handleAxis = handle.userData.axis;
    const handleTag = handle.userData.tag;

    const lerp = ( x: number, y: number, a: number ) => {
      return x * (1 - a) + y * a;
    }
    const equals = ( c1: Color, c2: Color ) => {
      return Math.abs( c1.r - c2.r ) < this.FADE_EPS && Math.abs( c1.g - c2.g ) < this.FADE_EPS && Math.abs( c1.b - c2.b ) < this.FADE_EPS;
    }

    if ( handleTag !== 'picker' ) {

      const material = handle.material as MeshBasicMaterial;
      material.userData.color = material.userData.color || material.color.clone();
      material.userData.opacity = material.userData.opacity || material.opacity;
      material.userData.highlightColor = material.userData.highlightColor || material.color.clone().lerp( new Color( 1, 1, 1 ), 0.5 );
      material.userData.highlightOpacity = material.userData.highlightOpacity || lerp( material.opacity, 1, 0.75 );

      // highlight selected axis
      let highlight = 0;
      if ( ! this.enabled || (this.activeMode && handleType !== this.activeMode ) ) {
        highlight = -1;
      } else if ( this.activeAxis ) {
        if ( handleAxis === this.activeAxis ) {
          highlight = 1;
        } else if ( this.activeAxis.split( '' ).some( (a: string) => { return handleAxis === a } ) ) {
          highlight = 1;
        } else {
          highlight = - 1;
        }
      }

      this._targetColor.copy( material.color );
      let _targetOpacity = material.opacity;

      if ( highlight === 0 ) {
        this._targetColor.lerp( material.userData.color, this.FADE_FACTOR );
        _targetOpacity = lerp( _targetOpacity, material.userData.opacity, this.FADE_FACTOR );
      } else if ( highlight === -1 ) {
        _targetOpacity = lerp( _targetOpacity, material.userData.opacity * 0.125, this.FADE_FACTOR );
        this._targetColor.lerp( material.userData.highlightColor, this.FADE_FACTOR );
      } else if ( highlight === 1 ) {
        _targetOpacity = lerp( _targetOpacity, material.userData.highlightOpacity, this.FADE_FACTOR );
        this._targetColor.lerp( material.userData.highlightColor, this.FADE_FACTOR );
      }

      if ( !equals( material.color, this._targetColor ) || !(Math.abs( material.opacity - _targetOpacity ) < this.FADE_EPS) ) {
        material.color.copy( this._targetColor );
        material.opacity = _targetOpacity;
        this.needsAnimationFrame = true;
      }
    }
  }
  updateHandle( handle: Mesh ) {
    this.updateHandleMaterial( handle );
    if ( handle.userData.type === 'scale' && this.space === 'world') {
      if ( ['XYZX', 'XYZY', 'XYZZ'].indexOf( handle.userData.axis ) === -1 ) handle.visible = false;
    }
  }

  updateMatrixWorld() {
    if ( this.object ) {
      this.object.updateMatrixWorld();
      if ( this.object.parent === null ) {
        console.error( 'TransformControls: The attached 3D object must be a part of the scene graph.' );
      } else {
        this.object.parent.matrixWorld.decompose( this._parentWorldPosition, this._parentWorldQuaternion, this._parentWorldScale );
      }
      this.object.matrixWorld.decompose( this._objectWorldPosition, this._objectWorldQuaternion, this._objectWorldScale );
      this._parentWorldQuaternionInv.copy( this._parentWorldQuaternion ).invert();
      this._objectWorldQuaternionInv.copy( this._objectWorldQuaternion ).invert();
    }
    this.position.copy( this._objectWorldPosition );
    this._helper.quaternion.copy( this.space === 'local' ? this._objectWorldQuaternion : this._identityQuaternion );

    // Se helper visibility properties.
    this._helper.size = this.size;
    this._helper.showX = this.showX;
    this._helper.showY = this.showY;
    this._helper.showZ = this.showZ;
    this._helper.showTranslate = this.showTranslate;
    this._helper.showRotate = this.showRotate;
    this._helper.showScale = this.showScale;

    super.updateMatrixWorld();

    for ( let i = 0; i < this._helper.children.length; i ++ ) {
      this.updateHandle( this._helper.children[ i ] as Mesh );
    }
  }

  getPlaneNormal(): Vector3 {
    this._dirX.set( 1, 0, 0 ).applyQuaternion( this.space === 'local' ? this._objectWorldQuaternion : this._identityQuaternion );
    this._dirY.set( 0, 1, 0 ).applyQuaternion( this.space === 'local' ? this._objectWorldQuaternion : this._identityQuaternion );
    this._dirZ.set( 0, 0, 1 ).applyQuaternion( this.space === 'local' ? this._objectWorldQuaternion : this._identityQuaternion );
    // Align the plane for current transform mode, axis and space.
    const cameraQuaternion = this.viewport?.camera.quaternion || this._identityQuaternion;
    switch ( this.activeMode ) {
      case 'translate':
      case 'scale':
        switch ( this.activeAxis ) {
          case 'X':
            this._dirVector.set( 0, 0, 1 ).applyQuaternion( cameraQuaternion ).normalize().cross( this._dirX ).cross( this._dirX );
            break;
          case 'Y':
            this._dirVector.set( 0, 0, 1 ).applyQuaternion( cameraQuaternion ).normalize().cross( this._dirY ).cross( this._dirY );
            break;
            case 'Z':
            this._dirVector.set( 0, 0, 1 ).applyQuaternion( cameraQuaternion ).normalize().cross( this._dirZ ).cross( this._dirZ );
            break;
          case 'XY':
            this._dirVector.copy( this._dirZ );
            break;
          case 'YZ':
            this._dirVector.copy( this._dirX );
            break;
          case 'XZ':
            this._dirVector.copy( this._dirY );
            break;
          case 'XYZ':
          case 'XYZX':
          case 'XYZY':
          case 'XYZZ':
          case 'E':
            this._dirVector.set( 0, 0, 1 ).applyQuaternion( cameraQuaternion ).normalize();
            break;
        }
        break;
      case 'rotate':
      default:
        // special case for rotate
        this._dirVector.set( 0, 0, 1 ).applyQuaternion( cameraQuaternion ).normalize();
    }
    return this._dirVector;
  }

  onTrackedPointerHover( pointer: PointerTracker ): void {
    if ( !this.object || this.active === true ) return;
    const pickers = this._helper.children.filter((child: Object3D) => {
      return child.userData.tag === 'picker';
    });
    const intersect = getFirstIntersection(pointer.intersectObjects(pickers), false);
    if ( intersect && !pointer.isSimulated ) {
      this.activeMode = intersect.object.userData.type;
      this.activeAxis = intersect.object.userData.axis;
    } else {
      this.activeMode = '';
      this.activeAxis = '';
    }
  }

  onTrackedPointerDown( pointer: PointerTracker ): void {
    // TODO: Unhack! This enables axis reset/interrupt when simulated pointer is driving gesture with inertia.
    this.activeAxis = '';
    // TODO: consider triggering hover from Controls.js
    // Simulates hover before down on touchscreen
    this.onTrackedPointerHover( pointer );
    // TODO: Unhack! This enables axis reset/interrupt when simulated pointer is driving gesture with inertia.
    if ( this.activeAxis === '' ) {
      this.active = false;
      this.dragging = false;
    }

    if ( !this.object || this.dragging === true || pointer.button !== 0 ) return;

    if ( this.activeAxis !== '' ) {

      let space = this.space;
      if ( this.activeMode === 'scale' ) {
        space = 'local';
      } else if ( this.activeAxis === 'E' || this.activeAxis === 'XYZE' || this.activeAxis === 'XYZ' ) {
        space = 'world';
      }
      if ( space === 'local' && this.activeMode === 'rotate' ) {
        const snap = this.rotationSnap;
        if ( this.activeAxis === 'X' && snap ) this.object.rotation.x = Math.round( this.object.rotation.x / snap ) * snap
        if ( this.activeAxis === 'Y' && snap ) this.object.rotation.y = Math.round( this.object.rotation.y / snap ) * snap
        if ( this.activeAxis === 'Z' && snap ) this.object.rotation.z = Math.round( this.object.rotation.z / snap ) * snap;
      }
      this.object.updateMatrixWorld();
      if ( this.object.parent ) this.object.parent.updateMatrixWorld();
      this._objectPositionStart.copy( this.object.position );
      this._objectQuaternionStart.copy( this.object.quaternion );
      this._objectQuaternionStartInv.copy( this.object.quaternion ).invert();
      this._objectScaleStart.copy( this.object.scale );
      this.object.matrixWorld.decompose( this._objectWorldPositionStart, this._objectWorldQuaternionStart, this._objectWorldScaleStart );

      this.dragging = true;
      this.active = true;
      this._transformMatrixStart.copy( this.object.matrix );
      this.dispatchEvent( Object.assign( { object: this.object }, EVENT.START ) );
      // TODO: Deprecate
      this.dispatchEvent( { type: 'mouseDown'} );
    }
  }

  onTrackedPointerMove( pointer: PointerTracker ): void {
    const axis = this.activeAxis
    const mode = this.activeMode
    const object = this.object
    let space = this.space;
    if ( mode === 'scale' ) {
      space = 'local';
    } else if ( axis === 'E' || axis === 'XYZE' || axis === 'XYZ' ) {
      space = 'world';
    }
    if ( pointer.isSimulated ) this.dragging = false;
    if ( !object || axis === '' || this.active === false || pointer.button !== 0 ) return;
    this._plane.setFromNormalAndCoplanarPoint( this.getPlaneNormal(), this._objectWorldPosition );
    const intersection = pointer.projectOnPlane( this._plane, this.minGrazingAngle );

    if ( !intersection ) return; // TODO: handle intersection miss

    this._pointStart.copy( intersection.start ).sub( this._objectWorldPositionStart );
    this._pointEnd.copy( intersection.current ).sub( this._objectWorldPositionStart );

    if ( mode === 'translate' ) {
      // Apply translate
      this._offset.copy( this._pointEnd ).sub( this._pointStart );
      if ( space === 'local' ) {
        this._offset.applyQuaternion( this._objectQuaternionStartInv );
      }

      if ( axis.indexOf( 'X' ) === - 1 ) this._offset.x = 0
      if ( axis.indexOf( 'Y' ) === - 1 ) this._offset.y = 0
      if ( axis.indexOf( 'Z' ) === - 1 ) this._offset.z = 0;

      if ( space === 'local' ) {
        this._offset.applyQuaternion( this._objectQuaternionStart ).divide( this._parentWorldScale );
      } else {
        this._offset.applyQuaternion( this._parentWorldQuaternionInv ).divide( this._parentWorldScale );
      }
      object.position.copy( this._offset ).add( this._objectPositionStart );
      // Apply translation snap
      if ( this.translationSnap ) {
        if ( space === 'local' ) {
          object.position.applyQuaternion( this._tempQuaternion.copy( this._objectQuaternionStart ).invert() );
          if ( axis.search( 'X' ) !== - 1 ) {
            object.position.x = Math.round( object.position.x / this.translationSnap ) * this.translationSnap;
          }
          if ( axis.search( 'Y' ) !== - 1 ) {
            object.position.y = Math.round( object.position.y / this.translationSnap ) * this.translationSnap;
          }
          if ( axis.search( 'Z' ) !== - 1 ) {
            object.position.z = Math.round( object.position.z / this.translationSnap ) * this.translationSnap;
          }
          object.position.applyQuaternion( this._objectQuaternionStart );
        }
        if ( space === 'world' ) {
          if ( object.parent ) {
            object.position.add( this._parentWorldPosition );
          }
          if ( axis.search( 'X' ) !== - 1 ) {
            object.position.x = Math.round( object.position.x / this.translationSnap ) * this.translationSnap;
          }
          if ( axis.search( 'Y' ) !== - 1 ) {
            object.position.y = Math.round( object.position.y / this.translationSnap ) * this.translationSnap;
          }
          if ( axis.search( 'Z' ) !== - 1 ) {
            object.position.z = Math.round( object.position.z / this.translationSnap ) * this.translationSnap;
          }
          if ( object.parent ) {
            object.position.sub( this._parentWorldPosition );
          }
        }
      }
    } else if ( mode === 'scale' ) {
      if ( axis.search( 'XYZ' ) !== - 1 ) {
        let d = this._pointEnd.length() / this._pointStart.length();
        if ( this._pointEnd.dot( this._pointStart ) < 0 ) d *= - 1;
        this._offset.set( d, d, d );
      } else {
        this._tempVector.copy( this._pointStart );
        this._offset.copy( this._pointEnd );
        this._tempVector.applyQuaternion( this._objectWorldQuaternionInv );
        this._offset.applyQuaternion( this._objectWorldQuaternionInv );
        this._offset.divide( this._tempVector );
        if ( axis.search( 'X' ) === - 1 ) {
          this._offset.x = 1;
        }
        if ( axis.search( 'Y' ) === - 1 ) {
          this._offset.y = 1;
        }
        if ( axis.search( 'Z' ) === - 1 ) {
          this._offset.z = 1;
        }
      }
      // Apply scale
      object.scale.copy( this._objectScaleStart ).multiply( this._offset );
      if ( this.scaleSnap ) {
        if ( axis.search( 'X' ) !== - 1 ) {
          object.scale.x = Math.round( object.scale.x / this.scaleSnap ) * this.scaleSnap || this.scaleSnap;
        }
        if ( axis.search( 'Y' ) !== - 1 ) {
          object.scale.y = Math.round( object.scale.y / this.scaleSnap ) * this.scaleSnap || this.scaleSnap;
        }
        if ( axis.search( 'Z' ) !== - 1 ) {
          object.scale.z = Math.round( object.scale.z / this.scaleSnap ) * this.scaleSnap || this.scaleSnap;
        }
      }
    } else if ( mode === 'rotate' ) {
      this._offset.copy( this._pointEnd ).sub( this._pointStart );
      const ROTATION_SPEED = 20 / this._objectWorldPosition.distanceTo( this._cameraPosition );
      if ( axis === 'E' ) {
        this._rotationAxis.copy( this.eye );
        this._rotationAngle = this._pointEnd.angleTo( this._pointStart );
        this._startNorm.copy( this._pointStart ).normalize();
        this._endNorm.copy( this._pointEnd ).normalize();
        this._rotationAngle *= ( this._endNorm.cross( this._startNorm ).dot( this.eye ) < 0 ? 1 : - 1 );
      } else if ( axis === 'XYZE' ) {
        this._rotationAxis.copy( this._offset ).cross( this.eye ).normalize();
        this._rotationAngle = this._offset.dot( this._tempVector.copy( this._rotationAxis ).cross( this.eye ) ) * ROTATION_SPEED;
      } else if ( axis === 'X' || axis === 'Y' || axis === 'Z' ) {
        this._rotationAxis.copy( UNIT[ axis ] );
        this._tempVector.copy( UNIT[ axis ] );
        if ( space === 'local' ) {
          this._tempVector.applyQuaternion( this._objectWorldQuaternion );
        }
        this._rotationAngle = this._offset.dot( this._tempVector.cross( this.eye ).normalize() ) * ROTATION_SPEED;
      }
      // Apply rotation snap
      if ( this.rotationSnap ) this._rotationAngle = Math.round( this._rotationAngle / this.rotationSnap ) * this.rotationSnap;
      // Apply rotat
      if ( space === 'local' && axis !== 'E' && axis !== 'XYZE' ) {
        object.quaternion.copy( this._objectQuaternionStart );
        object.quaternion.multiply( this._tempQuaternion.setFromAxisAngle( this._rotationAxis, this._rotationAngle ) ).normalize();
      } else {
        this._rotationAxis.applyQuaternion( this._parentWorldQuaternionInv );
        object.quaternion.copy( this._tempQuaternion.setFromAxisAngle( this._rotationAxis, this._rotationAngle ) );
        object.quaternion.multiply( this._objectQuaternionStart ).normalize();
      }
    }
    this.updateMatrixWorld();

    this.dispatchEvent( EVENT.CHANGE );
    this._transformMatrixEnd.copy( object.matrix );
    this._trandformMatrixOffset.copy( this._transformMatrixStart ).invert().multiply( this._transformMatrixEnd );
    this.dispatchEvent( Object.assign( { object: this.object, startMatrix: this._transformMatrixStart, currentMatrix: this._transformMatrixEnd }, TRANSFORM_CHANGE_EVENT ) );
  }

  onTrackedPointerUp( pointer: PointerTracker ): void {
    if ( pointer.button > 0 || !this.object ) return;
    if ( this.active ) { // this.activeAxis !== '' ?
      this._transformMatrixEnd.copy( this.object.matrix );
      this._trandformMatrixOffset.copy( this._transformMatrixStart ).invert().multiply( this._transformMatrixEnd );
      this.dispatchEvent( Object.assign( { object: this.object, startMatrix: this._transformMatrixStart, endMatrix: this._transformMatrixEnd }, EVENT.END ) );
      // TODO: Deprecate
      this.dispatchEvent( { type: 'mouseUp'} );
    }
    this.active = false;
    this.dragging = false;
    this.activeAxis = '';
  }
  dispose() {
    this.traverse( ( child: Object3D ) => {
      const mesh = child as Mesh;
      if ( mesh.geometry ) mesh.geometry.dispose();
      if ( mesh.material ) (mesh.material as MeshBasicMaterial).dispose();
    } );
  }
  // Set current object
  attach( object: Object3D ): this {
    this.object = object;
    this.visible = true;
    return this;
  }
  // Detatch from object
  detach(): this {
    this.object = undefined;
    this.visible = false;
    this.activeAxis = '';
    return this;
  }
  // TODO: deprecate
  getMode() {
    console.warn( 'THREE.TransformControls: getMode function has been deprecated. Use showTranslate, showScale and showRotate.' );
  }
  setMode( mode: 'translate' | 'rotate' | 'scale' ) {
    console.warn( 'THREE.TransformControls: setMode function has been deprecated. Use showTranslate, showScale and showRotate.' );
    this.showTranslate = mode === 'translate';
    this.showRotate = mode === 'rotate';
    this.showScale = mode === 'scale';
  }
  setTranslationSnap( translationSnap: number ) {
    console.warn( 'THREE.TransformControls: setTranslationSnap function has been deprecated.' );
    this.translationSnap = translationSnap;
  }
  setRotationSnap( rotationSnap: number ) {
    console.warn( 'THREE.TransformControls: setRotationSnap function has been deprecated.' );
    this.rotationSnap = rotationSnap;
  }
  setScaleSnap( scaleSnap: number ) {
    console.warn( 'THREE.TransformControls: setScaleSnap function has been deprecated.' );
    this.scaleSnap = scaleSnap;
  }
  setSize( size: number ) {
    console.warn( 'THREE.TransformControls: setSize function has been deprecated.' );
    this.size = size;
  }
  setSpace( space: string ) {
    console.warn( 'THREE.TransformControls: setSpace function has been deprecated.' );
    this.space = space;
  }
  update() {
    console.warn( 'THREE.TransformControls: update function has been deprecated.' );
  }
  addEventListener( type: string, listener: ( event: Event ) => void ): void {
    if ( [ 'mouseDown', 'mouseUp' ].indexOf( type ) !== -1 ) {
      console.warn( `You are using deprecated "${type}" event. Use "dragging-changed" event instead.` );
      return;
    }
    if ( type === 'objectChange' ) {
      console.warn( `You are using deprecated "${type}" event. Use "transform-changed" event instead.` );
      super.addEventListener( 'transform-changed', listener );
      return;
    }
    super.addEventListener( type, listener );
  }
}

export { TransformControls };
