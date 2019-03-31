package com.opentokreactnative;

import android.view.Gravity;
import android.widget.FrameLayout;

import com.facebook.react.uimanager.ThemedReactContext;
import com.opentok.android.BaseVideoRenderer;
import com.opentok.android.Subscriber;
import java.util.concurrent.ConcurrentHashMap;

import android.opengl.GLSurfaceView;

/**
 * Created by manik on 1/10/18.
 */

public class OTSubscriberLayout extends FrameLayout {

    public OTRN sharedState;
    private String streamId;

    public OTSubscriberLayout(ThemedReactContext reactContext) {

        super(reactContext);
        this.streamId = "";
        sharedState = OTRN.getSharedState();
    }

    public void createSubscriberView(String streamId) {
        this.streamId = streamId;
        /*ConcurrentHashMap<String, Subscriber> mSubscribers = sharedState.getSubscribers();
        mSubscribers.get(streamId).setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE, BaseVideoRenderer.STYLE_VIDEO_FILL);
        FrameLayout mSubscriberViewContainer = new FrameLayout(getContext());
        ConcurrentHashMap<String, FrameLayout> mSubscriberViewContainers = sharedState.getSubscriberViewContainers();
        mSubscriberViewContainers.put(streamId, mSubscriberViewContainer);
        addView(mSubscriberViewContainers.get(streamId), 0);
        Subscriber mSubscriber = mSubscribers.get(streamId);
        if (mSubscriber.getView() instanceof GLSurfaceView) {
            ((GLSurfaceView) mSubscriber.getView()).setZOrderMediaOverlay(false);
        }
        mSubscriberViewContainers.get(streamId).addView(mSubscribers.get(streamId).getView());
        requestLayout();
*/

        ConcurrentHashMap<String, Subscriber> mSubscribers = sharedState.getSubscribers();
        Subscriber mSubscriber = mSubscribers.get(streamId);
        FrameLayout mSubscriberViewContainer = new FrameLayout(getContext());
        if (mSubscriber != null) {
            mSubscriber.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                BaseVideoRenderer.STYLE_VIDEO_FILL);
            ConcurrentHashMap<String, FrameLayout> mSubscriberViewContainers = sharedState.getSubscriberViewContainers();
            mSubscriberViewContainers.put(streamId, mSubscriberViewContainer);
            addView(mSubscriberViewContainer, 0);
            if (mSubscriber.getView() instanceof GLSurfaceView) {
                ((GLSurfaceView) mSubscriber.getView()).setZOrderMediaOverlay(false);
            }
            mSubscriberViewContainer.addView(mSubscriber.getView());
            requestLayout();
        }

    }

    public void setZOrderMediaOverlay(Boolean flag) {
        String streamId = this.streamId;
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
