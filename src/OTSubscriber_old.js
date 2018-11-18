import React, { Component } from 'react';
import { View, Platform, TouchableOpacity, Text, Image } from 'react-native';
import PropTypes from 'prop-types';
import { OT, nativeEvents, setNativeEvents, removeNativeEvents } from './OT';
import OTSubscriberView from './views/OTSubscriberView';
import { handleError } from './OTError';
import { sanitizeSubscriberEvents, sanitizeProperties } from './helpers/OTSubscriberHelper';
import { isNull, each, isEqual } from 'underscore';

export default class OTSubscriber extends Component {
  constructor(props) {
    super(props);
    this.state = {
      streams: [],
      currentFullScreenStream: null,
      streamProperties: {},
      internalStreamProperties: {},
    };
    this.fitToHeight = false;
    this.activeFullScreen = '';
    this.subCollection = {};
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
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.fullScreenStreamId !== this.props.fullScreenStreamId) {
      const oldProp = Object.assign({}, this.state.internalStreamProperties);
      if (nextProps.fullScreenStreamId) {
        const currentFullScreenStream = nextProps.fullScreenStreamId;
        this.activeFullScreen = currentFullScreenStream;
        oldProp[currentFullScreenStream] = {
          ...oldProp[currentFullScreenStream],
          fullScreen: true,
        };
        this.setState({
          internalStreamProperties: oldProp,
        });
       
      } else {
        const currentFullScreenStream = this.activeFullScreen;
        oldProp[currentFullScreenStream] = {
          ...oldProp[currentFullScreenStream],
          fullScreen: false,
        };
        this.setState({
          internalStreamProperties: oldProp,
        });
        this.activeFullScreen = '';
      }
    }
  }
  parseName = (name) => {
    const regEx = /\>.*?\</g;
    const result = name.match(regEx);
    if (result.length > 2) {
      let firstSpan = result[0].replace(">", "");
      firstSpan = firstSpan.replace("<", "");

      let profilePic = result[1].replace(">", "");
      profilePic = profilePic.replace("<", "");
      if (profilePic.indexOf('default-user.jpg') > 0) {
        profilePic = null;
      }
      return {
        name: firstSpan,
        profilePic: profilePic
      }
    } else {
      let firstSpan = result[0].replace(">", "");
      firstSpan = firstSpan.replace("<", "");
      return {
        name: firstSpan,
      }
    }
  }
  streamPropertyChangedHandler = (propChangedValues) => {
    if (propChangedValues) {
      const currentProcessingStream = propChangedValues.stream;
      this.setInternalStreamProp(currentProcessingStream);
    }
  }
  setInternalStreamProp = (currentProcessingStream) => {
    const oldProp = Object.assign({}, this.state.internalStreamProperties);
    const nameObj = this.parseName(currentProcessingStream.name);
    oldProp[currentProcessingStream.streamId] = {
      hasAudio: currentProcessingStream.hasAudio,
      hasVideo: currentProcessingStream.hasVideo,
      basicInformation: nameObj,
      fullScreen: false,
      //width: currentProcessingStream.width,
      //height: currentProcessingStream.height,
    };
    if (!this.fitToHeight) {
      oldProp[currentProcessingStream.streamId] = {
        width: currentProcessingStream.width,
        height: currentProcessingStream.height,
      };
    }
    this.setState({
      internalStreamProperties: oldProp,
    });
  }
  streamCreatedHandler = (stream) => {
    this.setInternalStreamProp(stream);
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
  getProviderStream() {
    return this.state.streams[0] || null;
  }
  getParticipants(filterStream) {
    return this.state.streams.filter((stream) => stream !== filterStream);
  }
  getGrouppedStream() {
    const groupedStream = [];
    let currentStream = [];
    const totalStreams = this.state.streams.length + 1;
    const isEven = (totalStreams % 2 === 0);
    this.state.streams.forEach((streamId, index) => {
      currentStream.push(streamId);
      if (index === 0 && !isEven) {
        groupedStream.push([...currentStream]);
        currentStream = [];
      } else if (currentStream.length === 2) {
        groupedStream.push([...currentStream]);
        currentStream = [];
      }
    });
    // last item
    if (currentStream.length === 1) {
      groupedStream.push([...currentStream]);
    }
    return groupedStream;
  }
  getLayoutView() {
    const totalStreams = this.state.streams.length + 1;
    const numberOfRows = Math.ceil(totalStreams / 2);
    const height = this.activeFullScreen ? '100%' : 100 / numberOfRows;
    const otherParticipantsStreams = this.getGrouppedStream();
    let childrenWithStreams = null;
    if (totalStreams <= 2) {
      const currentFullScreenStream = this.state.currentFullScreenStream || this.getProviderStream();
      if (currentFullScreenStream) {
        const customProps = this.getCustomProperties(currentFullScreenStream);
        const currentStreamView = this.getVideBlock(currentFullScreenStream, customProps);
        childrenWithStreams = <View key={currentFullScreenStream} style={{ flex: 1 }}>
          {currentStreamView}
          {!this.props.swap && <View key={currentFullScreenStream} style={{ flex: 1, padding: 4, display: customProps.fullScreen ? 'none' : 'flex' }}>{this.props.children}</View>}
        </View>;
      }
    } else {
      childrenWithStreams = otherParticipantsStreams.map((items, index) => {
        const innerUI = items.map((streamId, _index) => {
          const customProps = this.getCustomProperties(streamId);
          const currentStreamView = this.getVideBlock(streamId, customProps);
          return <View key={streamId} style={{
            width: index === 0 && items.length === 1 ? '100%' : '50%',
            height: '100%',
          }}>{currentStreamView}</View>
        });
        if (index === numberOfRows - 1) {
          innerUI.push(<View key={-100} style={{
            width: '50%',
            height: '100%',
            padding: 4,
          }}>{this.props.children}</View>);
        }
        return <View key={index} style={{
          width: '100%',
          height: `${height}%`,
          flexDirection: 'column',
          flexWrap: 'wrap',
        }}>{innerUI}</View>
      });
    }
    return childrenWithStreams;
  }
  getCustomProperties(streamId) {
    const oldProp = Object.assign({}, this.state.internalStreamProperties);
    return oldProp[streamId] || {
      hasVideo: true,
      hasAudio: true,
      basicInformation: {
        name: ''
      },
      fullScreen: false,
    }
  }
  handleViewClick(currentFullScreenStream) {
    if (this.props.onViewClick) {
      this.props.onViewClick(currentFullScreenStream);
    }
    /*
    const oldProp = Object.assign({}, this.state.internalStreamProperties);
    oldProp[currentFullScreenStream] = {
      ...oldProp[currentFullScreenStream],
      fullScreen: !oldProp[currentFullScreenStream].fullScreen,
    };
    this.setState({
      internalStreamProperties: oldProp,
    });*/
  }
  getVideBlock = (currentFullScreenStream, customProps, isSmall) => { // hasVideo, basicInformation, isSmall) => {
    const { hasVideo, basicInformation, fullScreen, width, height } = customProps;
    const cloneWidth = width || '100%';
    const cloneHeight = height || '100%';
    let videoStyle = {
      flex: 1,
    };
    if (fullScreen) {
      videoStyle = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 1111,
        alignItems: 'center',
        justifyContent: 'center',
        padding: this.props.layoutView ? 4 : 0,
      };
    } else {
      videoStyle = {
        position: 'relative',
        flex: 1,
        zIndex: 1111,
        alignItems: 'center',
        justifyContent: 'center',
        padding: this.props.layoutView ? 4 : 0,
      }; 
    }
    const ViewContainer = fullScreen ? View : TouchableOpacity;
    return <ViewContainer style={videoStyle} onPress={this.handleViewClick.bind(this, currentFullScreenStream, customProps)} >
      {!hasVideo && <View style={{ width: '100%', height: '100%', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#20b2c1' }}>
        {!!basicInformation.profilePic && <Image
          style={{ width: isSmall ? 48 : 100, height: isSmall ? 48 : 100, borderRadius: isSmall ? 24 : 50 }}
          source={{ uri: basicInformation.profilePic }}
        />}
        {!!!basicInformation.profilePic && <View
          style={{
            width: isSmall ? 48 : 100, height: isSmall ? 48 : 100, borderRadius: isSmall ? 24 : 50,
            borderColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2
          }}
        ><Text style={{ fontSize: 24, fontFamily: 'GloberRegular', color: '#ffffff' }}>{(basicInformation.name || 'NA')[0]}</Text></View>}
        <Text style={{ fontSize: 18, fontFamily: 'GloberSemiBold', paddingTop: isSmall ? 4 : 8, color: '#ffffff' }}>{basicInformation.name}</Text></View>}
      <OTSubscriberView ref={(node) => this.subCollection[currentFullScreenStream] = node} key={currentFullScreenStream} streamId={currentFullScreenStream} style={{ height: '100%', width: '100%', maxWidth: cloneWidth, maxHeight: cloneHeight, display: hasVideo ? 'flex' : 'none' }} />
    </ViewContainer>;
  }
  getNormalView() {
    const totalStreams = this.state.streams.length + 1;
    const currentFullScreenStream = this.state.currentFullScreenStream || this.getProviderStream();
    if (totalStreams <= 2 && currentFullScreenStream) {
      const customProps = this.getCustomProperties(currentFullScreenStream);
      let mainBlock = null;
      let secBlock = null;
      const videoBlock = this.getVideBlock(currentFullScreenStream, customProps);
      if(this.props.swap) {
        mainBlock = this.props.children;
        secBlock = videoBlock;
      } else {
        mainBlock = videoBlock;
        secBlock = this.props.children;
      }
      return <View style={{ flex: 1 }}>
        <View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}>
          {mainBlock}
        </View>
        <View style={{
          position: 'absolute',
          bottom: 102,
          left: 16,
          width: 80,
          height: 142,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          display: this.props.selfView ? 'none' : 'flex',
        }}>{secBlock}</View>
      </View>;
    } else if (currentFullScreenStream) {
      const otherParticipantsStreams = this.getParticipants(currentFullScreenStream);
      const streamsUI = otherParticipantsStreams.map((streamId) => {
        const customProps = this.getCustomProperties(streamId);
        return <View key={streamId} style={{ flex: 1, padding: 4 }}>{this.getVideBlock(streamId, customProps, true)}</View>
      });
      if (currentFullScreenStream !== -100) {
        streamsUI.push(<View key={-100} onPress={this._switchStream.bind(this, -100)} style={{ flex: 1, padding: 4 }}>{this.props.children}</View>);
      }
      let patientPublisher = null;
      if (currentFullScreenStream !== -100) {
        const customProps = this.getCustomProperties(currentFullScreenStream);
        patientPublisher = this.getVideBlock(currentFullScreenStream, customProps);
      } else {
        patientPublisher = <View key={-100} onPress={this._switchStream.bind(this, -100)} style={{ flex: 1, padding: 4 }}>{this.props.children}</View>;
      }
      return <View style={{ flex: 1, paddingTop: 100, paddingBottom: 100 }}>
        <View style={{ flex: 1, padding: 4 }}>{patientPublisher}</View>
        <View style={{ height: 120, padding: 4, flexDirection: 'row' }}>{streamsUI}</View>
      </View>;
    }
    return null;
  }
  _switchStream() {
    /*
    this.setState({
      currentFullScreenStream,
    }); */
  }
  render() {
    let childrenWithStreams = null;
    if (this.props.layoutView) {
      childrenWithStreams = this.getLayoutView();
    } else {
      childrenWithStreams = this.getNormalView();
    }
    return childrenWithStreams;
  }
}

const viewPropTypes = View.propTypes;
OTSubscriber.propTypes = {
  ...viewPropTypes,
  properties: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  eventHandlers: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  streamProperties: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  layoutView: PropTypes.bool, // eslint-disable-line react/forbid-prop-types
  onViewClick: PropTypes.func, // eslint-disable-line react/forbid-prop-types
  fullScreenStreamId: PropTypes.string, // eslint-disable-line react/forbid-prop-types
  selfView: PropTypes.bool,
  swap: PropTypes.bool,
};

OTSubscriber.defaultProps = {
  properties: {},
  eventHandlers: {},
  streamProperties: {},
  layoutView: false,
  selfView: false,
  swap: false,
};
