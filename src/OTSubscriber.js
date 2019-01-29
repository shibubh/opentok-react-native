import React, { Component } from 'react';
import { View, Platform, Text, Image, TouchableOpacity } from 'react-native';
import PropTypes, { any } from 'prop-types';
import { OT, nativeEvents, setNativeEvents, removeNativeEvents } from './OT';
import OTSubscriberView from './views/OTSubscriberView';
import { handleError } from './OTError';
import { sanitizeSubscriberEvents, sanitizeProperties } from './helpers/OTSubscriberHelper';
import { isNull, isUndefined, each, isEqual, isEmpty } from 'underscore';

export default class OTSubscriber extends Component {
  constructor(props) {
    super(props);
    this.state = {
      streams: [],
      disableVideoCollection: {},
      disableAudioCollection: {},
    };
    this.componentEvents = {
      streamDestroyed: Platform.OS === 'android' ? 'session:onStreamDropped' : 'session:streamDestroyed',
      streamCreated: Platform.OS === 'android' ? 'session:onStreamReceived' : 'session:streamCreated',
      streamPropertyChanged: Platform.OS === 'android' ? 'session:onStreamPropertyChanged' : 'session:streamPropertyChanged',
    };
    this.componentEventsArray = Object.values(this.componentEvents);
  }
  componentWillMount() {
    this.streamCreated = nativeEvents.addListener(this.componentEvents.streamCreated, stream => this.streamCreatedHandler(stream));
    this.streamDestroyed = nativeEvents.addListener(this.componentEvents.streamDestroyed, stream => this.streamDestroyedHandler(stream));
    this.streamPropertyChanged = nativeEvents.addListener(this.componentEvents.streamPropertyChanged, stream => this.streamPropertyChangedHandler(stream));
    const subscriberEvents = sanitizeSubscriberEvents(this.props.eventHandlers);
    OT.setJSComponentEvents(this.componentEventsArray);
    setNativeEvents(subscriberEvents);
  }
  componentDidUpdate() {
    const { streamProperties } = this.props;
    if (!isEqual(this.state.streamProperties, streamProperties)) {
      each(streamProperties, (individualStreamProperties, streamId) => {
        const { subscribeToAudio, subscribeToVideo } = individualStreamProperties;
        OT.subscribeToAudio(streamId, subscribeToAudio);
        OT.subscribeToVideo(streamId, subscribeToVideo);
      });
      this.setState({ streamProperties });
    }
  }
  componentWillUnmount() {
    this.streamCreated.remove();
    this.streamDestroyed.remove();
    this.streamPropertyChanged.remove();
    OT.removeJSComponentEvents(this.componentEventsArray);
    const events = sanitizeSubscriberEvents(this.props.eventHandlers);
    removeNativeEvents(events);
  }
  streamCreatedHandler = (stream) => {
    const { streamProperties, properties } = this.props;
    const subscriberProperties = isNull(streamProperties[stream.streamId]) ?
      sanitizeProperties(properties) : sanitizeProperties(streamProperties[stream.streamId]);
    OT.subscribeToStream(stream.streamId, subscriberProperties, (error) => {
      if (error) {
        handleError(error);
      } else {
        this.setState({
          streams: [...this.state.streams, stream.streamId],
        });
      }
    });
  }
  streamDestroyedHandler = (stream) => {
    OT.removeSubscriber(stream.streamId, (error) => {
      if (error) {
        handleError(error);
      } else {
        const indexOfStream = this.state.streams.indexOf(stream.streamId);
        const newState = this.state.streams.slice();
        newState.splice(indexOfStream, 1);
        this.setState({
          streams: newState,
        });
      }
    });
  }
  streamPropertyChangedHandler = (event) => {
    switch (event.changedProperty) {
      case 'hasVideo':
        const streamId = event.stream.streamId;
        const disableVideoCollection = {
          ...this.state.disableVideoCollection,
          [streamId]: !event.newValue,
        };
        this.setState({
          disableVideoCollection
        });
        break;
      case 'hasAudio':
        const audioStreamId = event.stream.streamId;
        const disableAudioCollection = {
          ...this.state.disableAudioCollection,
          [audioStreamId]: !event.newValue,
        };
        this.setState({
          disableAudioCollection
        });
        break;
    }
    /*
    const stream = event.stream;
    const streamId = stream.streamId;
    const disableVideoCollection = {
      ...this.state.disableVideoCollection,
      [streamId]: !stream.hasVideo,
    };
    this.setState({
      disableVideoCollection
    }); */
  }
  render() {
    const disableVideoCollection = this.state.disableVideoCollection;
    const disableAudioCollection = this.state.disableAudioCollection;
    const numberOfStream = this.state.streams.length;
    const childrenWithStreams = this.state.streams.map((streamId) => {
      const streamProperties = this.props.streamProperties[streamId];
      const isFullScreen = streamProperties ? streamProperties.isFullScreen || false : false;
      let isProvider = false;
      let isShareScreen = false;
      const style = isEmpty(streamProperties) ? this.props.style : (isUndefined(streamProperties.style) || isNull(streamProperties.style)) ? this.props.style : streamProperties.style;
      let isVideoDisable = false;
      let isAudioDisable = false;
      let userName = '';
      let colorName = 'white';
      let userProfile = null;
      isVideoDisable = disableVideoCollection[streamId];
      isAudioDisable = disableAudioCollection[streamId];
      if (streamProperties && streamProperties.streamInformation) {
        const { name, profilePic } =  streamProperties.streamInformation;
        isProvider = streamProperties.streamInformation.isProvider;
        isShareScreen = streamProperties.streamInformation.isScreenShare;
        userName = name;
        userProfile = profilePic;
        colorName = streamProperties.colorName || 'white';
        if (!disableVideoCollection.hasOwnProperty(streamId)) {
          isVideoDisable = !streamProperties.streamInformation.hasVideo;
        }
        if (!disableAudioCollection.hasOwnProperty(streamId)) {
          isAudioDisable = !streamProperties.streamInformation.hasAudio;
        }
      }
      let rootStyle = { ...style };
      if (isVideoDisable) {
        rootStyle = {
          ...rootStyle,
          backgroundColor: colorName,
          borderRadius: 4,
        };
      }
      let muteStyle = {
        position: 'absolute',
        right: 4,
        borderRadius: 16,
        width: 32,
        height: 32,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
      };
      if ((isFullScreen || isProvider) && !this.props.layoutView) {
        muteStyle = {
          ...muteStyle,
          top: (numberOfStream === 1 || isFullScreen) ? 40: 10,
          right: 16,
        }
      } else if(isFullScreen) {
        muteStyle = {
          ...muteStyle,
          top: 40,
          right: 16,
        }
      } else {
        muteStyle = {
          ...muteStyle,
          bottom: 4,
        }
      }
      return <TouchableOpacity onPress={this.onViewClick.bind(this, streamId)} key={streamId} style={{ ...rootStyle }}>
        {isVideoDisable && <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {userProfile && <Image
            style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: 'white' }}
            source={{ uri: userProfile }}
          />}
          <Text style={{marginTop: 5, fontFamily: 'GloberBold', fontSize: 20, color: '#ffffff'}}>{userName}</Text></View>
        }
        <OTSubscriberView key={streamId} streamId={streamId} fitToView={isShareScreen ? 'fit' : this.props.fitToView}
          style={{ flex: 1, display: isVideoDisable ? 'none' : 'flex'}} />
        {!isShareScreen && isAudioDisable && this.props.muteElement && <View style={muteStyle}>
         {this.props.muteElement}
         </View>
        }
      </TouchableOpacity>
    });
    return childrenWithStreams;
  }
  onViewClick(streamId) {
    var onViewClick = this.props.onViewClick;
    if(onViewClick) {
      onViewClick(streamId);
    }
  }
}

const viewPropTypes = View.propTypes;
OTSubscriber.propTypes = {
  ...viewPropTypes,
  properties: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  eventHandlers: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  streamProperties: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onViewClick: PropTypes.func, // eslint-disable-line react/forbid-prop-types
  muteElement: PropTypes.element, // eslint-disable-line react/forbid-prop-types
  fitToView: PropTypes.string, // eslint-disable-line react/forbid-prop-types
};

OTSubscriber.defaultProps = {
  properties: {},
  eventHandlers: {},
  streamProperties: {},
  fitToView: '',
  muteElement: null
};
