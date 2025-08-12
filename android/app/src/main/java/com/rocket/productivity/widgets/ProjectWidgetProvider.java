package com.rocket.productivity.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.rocket.productivity.MainActivity;
import com.rocket.productivity.R;

public class ProjectWidgetProvider extends AppWidgetProvider {
    @Override
public void onDeleted(Context context, int[] appWidgetIds) {
    super.onDeleted(context, appWidgetIds);
    for (int id : appWidgetIds) {
        ProjectWidgetConfigureActivity.deleteKey(context, id);
    }
}


    private static final String ACTION_REFRESH = "com.rocket.productivity.widgets.ACTION_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, ProjectWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(thisWidget);
            for (int id : ids) {
                updateAppWidget(context, mgr, id);
            }
        }
    }

    // Paste this to replace the entire old method

private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_project);

    // 1. Set a default title
    views.setTextViewText(R.id.txt_title, "Rocket Productivity");

    // 2. Load the context (e.g., "Today") from the widget's configuration as a fallback
    String contextKey = ProjectWidgetConfigureActivity.loadKey(context, appWidgetId);
    if (contextKey == null || contextKey.trim().isEmpty()) {
        contextKey = "Today";
    }
    views.setTextViewText(R.id.txt_context, contextKey);

    // 3. Set a default "no items" message that will be overwritten if live data is found
    views.setTextViewText(R.id.row1, "• No items yet");
    views.setTextViewText(R.id.row2, "");
    views.setTextViewText(R.id.row3, "");

    // 4. Try to read and apply live data from Capacitor Preferences
    try {
        android.content.SharedPreferences capPrefs =
                context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

        // Override title if provided by the app
        String capTitle = capPrefs.getString("widget.title", null);
        if (capTitle != null && !capTitle.trim().isEmpty()) {
            views.setTextViewText(R.id.txt_title, capTitle);
        }

        // Override context if provided by the app
        String capContext = capPrefs.getString("widget.context", null);
        if (capContext != null && !capContext.trim().isEmpty()) {
            views.setTextViewText(R.id.txt_context, capContext);
        }

        // Expected: JSON array string like ["• Task 1","• Task 2","• Task 3"]
        String linesJson = capPrefs.getString("widget.lines", "[]");
        if (linesJson != null && !linesJson.trim().isEmpty()) {
            try {
                org.json.JSONArray arr = new org.json.JSONArray(linesJson);
                if (arr.length() > 0) {
                    // Only overwrite the placeholder if we have real data
                    views.setTextViewText(R.id.row1, arr.length() > 0 ? arr.optString(0, "") : "");
                    views.setTextViewText(R.id.row2, arr.length() > 1 ? arr.optString(1, "") : "");
                    views.setTextViewText(R.id.row3, arr.length() > 2 ? arr.optString(2, "") : "");
                }
            } catch (org.json.JSONException e) {
                // JSON was malformed, do nothing and keep default message
            }
        }
    } catch (Exception ignored) {
        // Safety: never crash the widget on bad prefs
    }

    // Tap footer to open app
    Intent openIntent = new Intent(context, MainActivity.class);
    openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent openPi = PendingIntent.getActivity(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
    views.setOnClickPendingIntent(R.id.txt_open_app, openPi);

    // Tap refresh icon to broadcast refresh to this provider
    Intent refreshIntent = new Intent(context, ProjectWidgetProvider.class);
    refreshIntent.setAction(ACTION_REFRESH);
    PendingIntent refreshPi = PendingIntent.getBroadcast(
            context,
            1,
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
    views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi);

    appWidgetManager.updateAppWidget(appWidgetId, views);
}
}
