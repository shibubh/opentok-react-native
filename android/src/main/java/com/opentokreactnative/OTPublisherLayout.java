package com.opentokreactnative;

import android.view.Gravity;
import android.widget.FrameLayout;
import android.opengl.GLSurfaceView;

import com.facebook.react.uimanager.ThemedReactContext;
import com.opentok.android.BaseVideoRenderer;
import com.opentok.android.Publisher;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Created by manik on 1/10/18.
 */

public class OTPublisherLayout extends FrameLayout{

    public OTRN sharedState;

    private String publisherId;

    public OTPublisherLayout(ThemedReactContext reactContext) {

        super(reactContext);
        sharedState = OTRN.getSharedState();
    }

    public void createPublisherView(String publisherId) {
        this.publisherId = publisherId;
        ConcurrentHashMap<String, Publisher> mPublishers = sharedState.getPublishers();
        ConcurrentHashMap<String, String> androidOnTopMap = sharedState.getAndroidOnTopMap();
        ConcurrentHashMap<String, String> androidZOrderMap = sharedState.getAndroidZOrderMap();
        String pubOrSub = "";
        String zOrder = "";
        Publisher mPublisher = mPublishers.get(publisherId);
        if (mPublisher != null) {
            if (androidOnTopMap.get(mPublisher.getSession().getSessionId()) != null) {
                pubOrSub = androidOnTopMap.get(mPublisher.getSession().getSessionId());
            }
            if (androidZOrderMap.get(mPublisher.getSession().getSessionId()) != null) {
                zOrder = androidZOrderMap.get(mPublisher.getSession().getSessionId());
            }
            mPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                    BaseVideoRenderer.STYLE_VIDEO_FILL);
            FrameLayout mPublisherViewContainer = new FrameLayout(getContext());
            ((GLSurfaceView) mPublisher.getView()).setZOrderMediaOverlay(false);
            ConcurrentHashMap<String, FrameLayout> mPublisherViewContainers = sharedState.getPublisherViewContainers();
            mPublisherViewContainers.put(publisherId, mPublisherViewContainer);
            addView(mPublisherViewContainer, 0);
            mPublisherViewContainer.addView(mPublisher.getView());
            requestLayout();
        }

    }

    public void updateFitLayout(String fitToView) {
        ConcurrentHashMap<String, Publisher> mPublishers = sharedState.getPublishers();
        Publisher mPublisher = mPublishers.get(this.publisherId);
        if (mPublisher != null) {
            if(fitToView == "fit") {
                mPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                        BaseVideoRenderer.STYLE_VIDEO_FIT);
            } else {
                mPublisher.setStyle(BaseVideoRenderer.STYLE_VIDEO_SCALE,
                        BaseVideoRenderer.STYLE_VIDEO_FILL);
            }
            requestLayout();
        }
    }

    public void setZOrderMediaOverlay(Boolean flag) {
        ConcurrentHashMap<String, Publisher> mPublishers = sharedState.getPublishers();
        Publisher mPublisher = mPublishers.get(this.publisherId);
        if (mPublishers != null && mPublisher.getView() instanceof GLSurfaceView) {
            ((GLSurfaceView) mPublisher.getView()).setZOrderMediaOverlay(flag);
        }
        requestLayout();

    }
    

}
