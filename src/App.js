import React from 'react';
import './App.css';
import ContentEditable from 'react-contenteditable';
import CustomScroll from 'react-custom-scroll';

function extractContent(html) {
  return (new DOMParser()).parseFromString(html, "text/html").documentElement.textContent;
}

function getCaretCharacterOffsetWithin(element) {
  var caretOffset = 0;
  var doc = element.ownerDocument || element.document;
  var win = doc.defaultView || doc.parentWindow;
  var sel;
  if (typeof win.getSelection != "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      var range = win.getSelection().getRangeAt(0);
      var preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if ( (sel = doc.selection) && sel.type != "Control") {
    var textRange = sel.createRange();
    var preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(element);
    preCaretTextRange.setEndPoint("EndToEnd", textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
}

// https://stackoverflow.com/questions/16736680/get-caret-position-in-contenteditable-div-including-tags
function getCaretPosition (node) {
  var range = window.getSelection().getRangeAt(0),
    preCaretRange = range.cloneRange(),
    caretPosition,
    tmp = document.createElement("div");

  preCaretRange.selectNodeContents(node);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  tmp.appendChild(preCaretRange.cloneContents());
  caretPosition = tmp.innerHTML.length;
  return caretPosition;
}

function getHTMLCaretPosition(element) {
  var textPosition = getCaretPosition(element),
    htmlContent = element.innerHTML,
    textIndex = 0,
    htmlIndex = 0,
    insideHtml = false,
    htmlBeginChars = ['&', '<'],
    htmlEndChars = [';', '>'];


  if (textPosition == 0) {
    return 0;
  }

  while(textIndex < textPosition) {

    htmlIndex++;

    // check if next character is html and if it is, iterate with htmlIndex to the next non-html character
    while(htmlBeginChars.indexOf(htmlContent.charAt(htmlIndex)) > -1) {
      // console.log('encountered HTML');
      // now iterate to the ending char
      insideHtml = true;

      while(insideHtml) {
        if (htmlEndChars.indexOf(htmlContent.charAt(htmlIndex)) > -1) {
          if (htmlContent.charAt(htmlIndex) == ';') {
            htmlIndex--; // entity is char itself
          }
          // console.log('encountered end of HTML');
          insideHtml = false;
        }
        htmlIndex++;
      }
    }
    textIndex++;
  }

  //console.log(htmlIndex);
  //console.log(textPosition);
  // in htmlIndex is caret position inside html
  return htmlIndex;
}

function spanWords(text) {
  return text
    .replace(/(<span>|<\/span>)/g, '')
    .split(' ')
    .map(word => word.indexOf('<span>') === -1
      ? `<span>${word}</span>`
      : word
    )
    .join(' ');
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    this.container = React.createRef();
    this.state = {
      html: '',
      caretPos: 0,
      currentWordStartIndex: 0,
      currentWordEndIndex: 0,
      currentWord: '',
      focusElement: null,
      topElements: 0,
      elements: 20,
      prevScrollTop: false,
      prevScrollHeight: 0,
    };
  }

  onChange = e => {
    this.setState({
      html: spanWords(e.target.value),
    });
  };

  onKeyUp = () => {
    const { html } = this.state;

    const selection = window.getSelection();
    console.log('selection: ', selection);
    const focusElement = selection.focusNode.parentElement;

    console.log('focusElement: ', focusElement);

    const caretPos = getHTMLCaretPosition(this.inputRef.current);
    const textBeforeCaret = html.substring(0, caretPos);
    const textAfterCaret = html.substring(caretPos);
    const currentWordStartIndex = textBeforeCaret.lastIndexOf(' ') !== -1
      ? textBeforeCaret.lastIndexOf(' ') + 1
      : 0;
    const currentWordEndIndex = textAfterCaret.indexOf(' ') !== -1
      ? textBeforeCaret.length + textAfterCaret.indexOf(' ')
      : html.length;
    const currentWord = html.substring(currentWordStartIndex, currentWordEndIndex);
    console.log('current word:' + currentWord);
    console.log('html: ', this.state.html);
    this.setState({
      caretPos,
      focusElement,
      currentWordStartIndex,
      currentWordEndIndex,
      currentWord,
    });
  };

  onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const { html, currentWordStartIndex, currentWordEndIndex, focusElement } = this.state;
      const focusElementStartIndex = html.indexOf(focusElement.innerHTML);

      console.log('focusElementStartIndex: ', focusElementStartIndex);

      let newHtml = html.replace(focusElement.innerHTML, '<b>MENTION</b>')

      this.setState({
        html: newHtml,
      });
    }
  };

  onScroll = (e) => {
    console.log('window: ', e.target.scrollTop);
  };

  componentDidMount() {
    setInterval(() => {
      this.setState({
        elements: this.state.elements + 4,
        prevScrollTop: this.container.current.scrollTop,
        prevScrollHeight: this.container.current.scrollHeight,
      });
    }, 2000);

    setInterval(() => {
      if (this.container.current.scrollTop === 0) {
        console.log('before update container scrollH: ', this.container.current.scrollHeight);
        this.setState({
          topElements: this.state.topElements + 10,
          prevScrollHeight: this.container.current.scrollHeight,
        });
      }
    }, 1000);

  }

  componentDidUpdate() {
    const { prevScrollTop, prevScrollHeight } = this.state;
    console.log('after update container scrollH: ', this.container.current.scrollHeight);
    if (this.container.current.scrollTop === 0) {
      this.container.current.scrollTo(0, this.container.current.scrollHeight - prevScrollHeight);

    }
    else if (prevScrollTop > prevScrollHeight - 720) {
      console.log('should scroll to bottom!');
      this.container.current.scrollTo(0, this.container.current.scrollHeight);
    }
    console.log('prev scroll top: ', prevScrollTop, prevScrollHeight);
  }

  render() {
    const {
      topElements,
      elements,
    } = this.state;



    return (
      <div
        className="container"
        onScroll={this.onScroll}
        ref={this.container}
      >
        <div>
        {[ ...Array(topElements).keys()].sort((a, b) => b - a).map(i => (
          <div
            key={i + 'top'}
            style={{
              height: '100px',
            }}
          >
            TOP {i}
          </div>)
        )}
        {[ ...Array(elements).keys()].map(i => (
          <div
            key={i + 'test'}
            style={{
              height: '100px',
            }}
          >
            TEST {i}
          </div>)
        )}
        </div>
      </div>
    );
  }
}

export default App;
