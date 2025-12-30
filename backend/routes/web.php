<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/', function () {
    return view('welcome');
});

// Temporary route to run migrations on the live server
Route::get('/migrate-fresh-database', function () {
    Artisan::call('migrate:fresh', [
        '--force' => true,
    ]);
    return 'Database migrations have been run.';
});