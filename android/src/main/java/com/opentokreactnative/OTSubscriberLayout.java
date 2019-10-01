package com.opentokreactnative;

import android.opengl.GLSurfaceView;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.facebook.react.uimanager.ThemedReactContext;
import com.opentok.android.BaseVideoRenderer;
import com.opentok.android.Subscriber;
import java.util.concurrent.ConcurrentHashMap;
import com.opentok.android.Stream.StreamVideoType;

/**
 * Created by manik on 1/10/18.
 */

public class OTSubscriberLayout extends FrameLayout{

    public OTRN sharedState;
    private String streamId;

    public OTSubscriberLayout(ThemedReactContext reactContext) {

        super(reactContext);
        sharedState = OTRN.getSharedState();
    }

    public void createSubscriberView(String streamId) {
        this.streamId = streamId;
        ConcurrentHashMap<String, Subscriber> mSubscribers = sharedState.getSubscribers();
        ConcurrentHashMap<String, String> androidOnTopMap = sharedState.getAndroidOnTopMap();
        ConcurrentHashMap<String, String> androidZOrderMap = sharedState.getAndroidZOrderMap();
        Subscriber mSubscriber = mSubscribers.get(streamId);
        FrameLayout mSubscriberViewContainer = new FrameLayout(getContext());
        
        String pubOrSub = "";
        String zOrder = "";
        if (mSubscriber != null) {
            if (mSubscriber.getSession() != null) {
                if (androidOnTopMap.get(mSubscriber.getSession().getSessionId()) != null) {
                    pubOrSub = androidOnTopMap.get(mSubscriber.getSession().getSessionId());
                }
                if (androidZOrderMap.get(mSubscriber.getSession().getSessionId()) != null) {
                    zOrder = androidZOrderMap.get(mSubscriber.getSession().getSessionId());
                }
            }
            if (mSubscriber.getView().getParent() != null) {
                ((ViewGroup)mSubscriber.getView().getParent()).removeView(mSubscriber.getView());
            }
            /*if(mSubscriber.getStream().getStreamVideoType() == StreamVideoType.StreamVideoTypeScreen) {
                mSubscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                        BaseVideoRenderer.STYLE_VIDEO_FIT);
            } else {
                mSubscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                        BaseVideoRenderer.STYLE_VIDEO_FILL);
            }*/
            mSubscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FILL);
            ((GLSurfaceView) mSubscriber.getView()).setZOrderMediaOverlay(true);
            ConcurrentHashMap<String, FrameLayout> mSubscriberViewContainers = sharedState.getSubscriberViewContainers();
            mSubscriberViewContainers.put(streamId, mSubscriberViewContainer);
            addView(mSubscriberViewContainer, 0);
            mSubscriberViewContainer.addView(mSubscriber.getView());
            requestLayout();
        }
    }

    public void updateFitLayout(String fitToView) {
        ConcurrentHashMap<String, Subscriber> mSubscribers = sharedState.getSubscribers();
        Subscriber mSubscriber = mSubscribers.get(this.streamId);
        if (mSubscriber != null) {
            if(fitToView == "fit") {
                mSubscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                        BaseVideoRenderer.STYLE_VIDEO_FIT);
            } else {
                mSubscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                        BaseVideoRenderer.STYLE_VIDEO_FILL);
            }
            requestLayout();
        }
    }
    public void setZOrderMediaOverlay(Boolean flag) {
        if (streamId.length() > 0) {
            ConcurrentHashMap<String, Subscriber> mSubscribers = sharedState.getSubscribers();
            Subscriber mSubscriber = mSubscribers.get(this.streamId);
            if (mSubscriber != null && mSubscriber.getView() instanceof GLSurfaceView) {
                ((GLSurfaceView) mSubscriber.getView()).setZOrderMediaOverlay(flag);
            }
            requestLayout();
        }

    }

}
