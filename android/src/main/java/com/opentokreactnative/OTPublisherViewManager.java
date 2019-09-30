package com.opentokreactnative;

/**
 * Created by manik on 1/10/18.
 */

import android.util.Log;

import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;


public class OTPublisherViewManager extends ViewGroupManager<OTPublisherLayout> {

    private String publisherId;
    @Override
    public String getName() {

        return this.getClass().getSimpleName();
    }

    @Override
    protected OTPublisherLayout createViewInstance(ThemedReactContext reactContext) {

        return new OTPublisherLayout(reactContext);
    }

    @ReactProp(name = "publisherId")
    public void setPublisherId(OTPublisherLayout view, String publisherId) {
        this.publisherId = publisherId;
        view.createPublisherView(publisherId);
    }

    @ReactProp(name = "fitToView")
    public void setFitToView(OTPublisherLayout view, String fitToView) {

        view.updateFitLayout(this.publisherId, fitToView);
    }


}
