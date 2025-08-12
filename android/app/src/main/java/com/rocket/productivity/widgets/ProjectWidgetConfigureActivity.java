package com.rocket.productivity.widgets;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import com.rocket.productivity.R;

public class ProjectWidgetConfigureActivity extends Activity {

    private static final String PREFS_NAME = "com.rocket.productivity.widgets.Prefs";
    private static final String PREF_PREFIX_KEY = "widget_key_";

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private EditText inputKey;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Default result if user backs out
        setResult(RESULT_CANCELED);

        setContentView(R.layout.widget_configure);

        inputKey = findViewById(R.id.input_key);
        Button btnCancel = findViewById(R.id.btn_cancel);
        Button btnSave = findViewById(R.id.btn_save);

        // Extract the widget ID from the intent
        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        // Prefill if we have a previous value (reconfiguring)
        String existing = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PREF_PREFIX_KEY + appWidgetId, "");
        if (!TextUtils.isEmpty(existing)) {
            inputKey.setText(existing);
            inputKey.setSelection(existing.length());
        }

        btnCancel.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });

        btnSave.setOnClickListener(v -> {
    String key = inputKey.getText().toString().trim();
    if (TextUtils.isEmpty(key)) {
        Toast.makeText(this, "Please enter a view/project name or ID", Toast.LENGTH_SHORT).show();
        return;
    }

    // Paste this to replace the block above

    // Save the view/project key
    getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_PREFIX_KEY + appWidgetId, key)
            .apply();

    // Tell the widget provider to update this widget
    AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
    Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE, null, this, ProjectWidgetProvider.class);
    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, new int[]{ appWidgetId });
    sendBroadcast(updateIntent);

    // Return success to the host
    Intent result = new Intent();
    result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
    setResult(RESULT_OK, result);
    finish();
});
    }

    // Static helpers the provider can use next step
    public static String loadKey(Context context, int appWidgetId) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PREF_PREFIX_KEY + appWidgetId, "");
    }

    public static void deleteKey(Context context, int appWidgetId) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(PREF_PREFIX_KEY + appWidgetId)
                .apply();
    }
}

