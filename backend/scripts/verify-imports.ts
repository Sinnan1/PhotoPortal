
try {
    console.log('Attempting to import uploadsController...');
    import('../src/controllers/uploadsController').then(() => {
        console.log('✅ Successfully imported uploadsController');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Import failed:', err);
        process.exit(1);
    });

} catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
}
