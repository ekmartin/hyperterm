/* global Blob,URL,requestAnimationFrame */
import React from 'react';
import Color from 'color';
import Component from '../component';
import { getColorList } from '../utils/colors';
import notify from '../utils/notify';

export default class Term extends Component {

  constructor (props) {
    super(props);
    this.onWheel = this.onWheel.bind(this);
    this.onScrollEnter = this.onScrollEnter.bind(this);
    this.onScrollLeave = this.onScrollLeave.bind(this);
    this.onFocus = this.onFocus.bind(this);
    props.ref_(this);
  }

  componentDidMount () {
    const { props } = this;

    // the first term that's created has unknown size
    // subsequent new tabs have size
    if (props.cols && props.rows) {
      props.term.realizeSize_(props.cols, props.rows);
    }

    props.term.prefs_.set('font-family', props.fontFamily);
    props.term.prefs_.set('font-size', props.fontSize);
    props.term.prefs_.set('font-smoothing', props.fontSmoothing);
    props.term.prefs_.set('cursor-color', this.validateColor(props.cursorColor, 'rgba(255,255,255,0.5)'));
    props.term.prefs_.set('enable-clipboard-notice', false);
    props.term.prefs_.set('foreground-color', props.foregroundColor);
    props.term.prefs_.set('background-color', props.backgroundColor);
    props.term.prefs_.set('color-palette-overrides', getColorList(props.colors));
    props.term.prefs_.set('user-css', this.getStylesheet(props.customCSS));
    props.term.prefs_.set('scrollbar-visible', false);
    props.term.prefs_.set('receive-encoding', 'raw');
    props.term.prefs_.set('send-encoding', 'raw');
    props.term.prefs_.set('alt-sends-what', 'browser-key');

    if (props.bell === 'SOUND') {
      props.term.prefs_.set('audible-bell-sound', this.props.bellSoundURL);
    } else {
      props.term.prefs_.set('audible-bell-sound', '');
    }

    if (props.copyOnSelect) {
      props.term.prefs_.set('copy-on-select', true);
    } else {
      props.term.prefs_.set('copy-on-select', false);
    }

    props.term.decorate(this.refs.term);
    props.term.installKeyboard();
    if (this.props.onTerminal) this.props.onTerminal(props.term);

    const iframeWindow = this.getTermDocument().defaultView;
    iframeWindow.addEventListener('wheel', this.onWheel);

    const screenNode = this.getScreenNode();
    // TODO: This doesn't work with applications
    // that listen to click events (like htop):
    screenNode.addEventListener('focus', this.onFocus);
  }

  onWheel (e) {
    if (this.props.onWheel) {
      this.props.onWheel(e);
    }
    this.props.term.prefs_.set('scrollbar-visible', true);
    clearTimeout(this.scrollbarsHideTimer);
    if (!this.scrollMouseEnter) {
      this.scrollbarsHideTimer = setTimeout(() => {
        this.props.term.prefs_.set('scrollbar-visible', false);
      }, 1000);
    }
  }

  onScrollEnter () {
    clearTimeout(this.scrollbarsHideTimer);
    this.props.term.prefs_.set('scrollbar-visible', true);
    this.scrollMouseEnter = true;
  }

  onScrollLeave () {
    this.props.term.prefs_.set('scrollbar-visible', false);
    this.scrollMouseEnter = false;
  }

  onFocus () {
    // TODO: This will in turn result in `this.focus()` being
    // called, which is unecessary.
    // Should investigate if it matters.
    this.props.onActive();
  }

  write (data) {
    requestAnimationFrame(() => {
      this.props.term.io.writeUTF8(data);
    });
  }

  focus () {
    this.props.term.focus();
  }

  clear () {
    this.props.term.clearPreserveCursorRow();

    // If cursor is still not at the top, a command is probably
    // running and we'd like to delete the whole screen.
    // Move cursor to top
    if (this.props.term.getCursorRow() !== 0) {
      this.props.term.io.writeUTF8('\x1B[0;0H\x1B[2J');
    }
  }

  moveWordLeft () {
    this.props.term.onVTKeystroke('\x1bb');
  }

  moveWordRight () {
    this.props.term.onVTKeystroke('\x1bf');
  }

  deleteWordLeft () {
    this.props.term.onVTKeystroke('\x1b\x7f');
  }

  deleteWordRight () {
    this.props.term.onVTKeystroke('\x1bd');
  }

  deleteLine () {
    this.props.term.onVTKeystroke('\x1bw');
  }

  moveToStart () {
    this.props.term.onVTKeystroke('\x01');
  }

  moveToEnd () {
    this.props.term.onVTKeystroke('\x05');
  }

  selectAll () {
    this.term.selectAll();
  }

  getScreenNode () {
    return this.props.term.scrollPort_.getScreenNode();
  }

  getTermDocument () {
    return this.props.term.document_;
  }

  getStylesheet (css) {
    const blob = new Blob([`
      .cursor-node[focus="false"] {
        border-width: 1px !important;
      }
      ${css}
    `], { type: 'text/css' });
    return URL.createObjectURL(blob);
  }

  validateColor (color, alternative = 'rgb(255,255,255)') {
    try {
      return Color(color).rgbString();
    } catch (err) {
      notify(`color "${color}" is invalid`);
    }
    return alternative;
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.url !== nextProps.url) {
      // when the url prop changes, we make sure
      // the terminal starts or stops ignoring
      // key input so that it doesn't conflict
      // with the <webview>
      if (nextProps.url) {
        const io = this.props.term.io.push();
        io.onVTKeystroke = io.sendString = (str) => {
          if (1 === str.length && 3 === str.charCodeAt(0) /* Ctrl + C */) {
            this.props.onURLAbort();
          }
        };
      } else {
        this.props.term.io.pop();
      }
    }

    if (!this.props.cleared && nextProps.cleared) {
      this.clear();
    }

    if (this.props.fontSize !== nextProps.fontSize) {
      this.props.term.prefs_.set('font-size', nextProps.fontSize);
    }

    if (this.props.foregroundColor !== nextProps.foregroundColor) {
      this.props.term.prefs_.set('foreground-color', nextProps.foregroundColor);
    }

    if (this.props.backgroundColor !== nextProps.backgroundColor) {
      this.props.term.prefs_.set('background-color', nextProps.backgroundColor);
    }

    if (this.props.fontFamily !== nextProps.fontFamily) {
      this.props.term.prefs_.set('font-family', nextProps.fontFamily);
    }

    if (this.props.fontSmoothing !== nextProps.fontSmoothing) {
      this.props.term.prefs_.set('font-smoothing', nextProps.fontSmoothing);
    }

    if (this.props.cursorColor !== nextProps.cursorColor) {
      this.props.term.prefs_.set('cursor-color', this.validateColor(nextProps.cursorColor, 'rgba(255,255,255,0.5)'));
    }

    if (this.props.cursorShape !== nextProps.cursorShape) {
      this.props.term.setCursorShape(nextProps.cursorShape);
    }

    if (this.props.colors !== nextProps.colors) {
      this.props.term.prefs_.set('color-palette-overrides', getColorList(nextProps.colors));
    }

    if (this.props.customCSS !== nextProps.customCSS) {
      this.props.term.prefs_.set('user-css', this.getStylesheet(nextProps.customCSS));
    }

    if (this.props.bell === 'SOUND') {
      this.props.term.prefs_.set('audible-bell-sound', this.props.bellSoundURL);
    } else {
      this.props.term.prefs_.set('audible-bell-sound', '');
    }

    if (this.props.copyOnSelect) {
      this.props.term.prefs_.set('copy-on-select', true);
    } else {
      this.props.term.prefs_.set('copy-on-select', false);
    }
  }

  componentWillUnmount () {
    clearTimeout(this.scrollbarsHideTimer);
    this.props.ref_(null);
  }

  template (css) {
    return <div
      className={ css('fit') }
      style={{ padding: this.props.padding }}>
      { this.props.customChildrenBefore }
      <div ref='term' className={ css('fit', 'term') } />
      { this.props.url
        ? <webview
            src={this.props.url}
            style={{
              background: '#000',
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'inline-flex',
              width: '100%',
              height: '100%'
            }}></webview>
        : <div
            className={ css('scrollbarShim') }
            onMouseEnter={ this.onScrollEnter }
            onMouseLeave={ this.onScrollLeave } />
      }
      { this.props.customChildren }
    </div>;
  }

  styles () {
    return {
      fit: {
        display: 'block',
        width: '100%',
        height: '100%'
      },

      term: {
        position: 'relative'
      },

      scrollbarShim: {
        position: 'fixed',
        right: 0,
        width: '50px',
        top: 0,
        bottom: 0,
        pointerEvents: 'none'
      }
    };
  }

}
