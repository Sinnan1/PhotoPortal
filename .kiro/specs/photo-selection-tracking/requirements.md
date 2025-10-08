# Requirements Document

## Introduction

The Photo Selection Tracking feature provides real-time counting and display of client photo selections across different event categories (folders) within galleries. This system gives both photographers and clients visibility into selection activity, showing how many photos have been selected from each folder and overall gallery totals.

The feature integrates with the existing gallery system where folders represent different event types (barat, walima, mehendi, etc.) and provides live counters that update immediately as clients make or remove selections.

## Requirements

### Requirement 1

**User Story:** As a client, I want to see real-time counts of my photo selections for each folder, so that I can track how many photos I've selected from each event category.

#### Acceptance Criteria

1. WHEN a client views a gallery THEN the system SHALL display selection counts for each folder showing "X selected out of Y total photos"
2. WHEN a client selects a photo THEN the system SHALL immediately increment the count for the corresponding folder
3. WHEN a client deselects a photo THEN the system SHALL immediately decrement the count for the corresponding folder
4. WHEN a client views folder selection counts THEN the system SHALL show both selected count and total photo count for each folder
5. IF a folder has no photos selected THEN the system SHALL display "0 selected out of Y total photos"

### Requirement 2

**User Story:** As a client, I want to see an overall selection summary for the entire gallery, so that I can understand my total selection activity across all event categories.

#### Acceptance Criteria

1. WHEN a client views a gallery THEN the system SHALL display a total selection count showing "X photos selected across all folders"
2. WHEN a client makes selections THEN the system SHALL update the overall total in real-time
3. WHEN a client views the selection summary THEN the system SHALL show a breakdown by folder with individual counts
4. WHEN a client has selected photos from multiple folders THEN the system SHALL display the distribution clearly
5. IF a client has made no selections THEN the system SHALL display "No photos selected yet"

### Requirement 3

**User Story:** As a photographer, I want to view client selection activity across my galleries, so that I can see which clients are actively making selections and monitor overall engagement.

#### Acceptance Criteria

1. WHEN a photographer accesses the admin dashboard THEN the system SHALL display selection statistics for all galleries
2. WHEN a photographer views selection statistics THEN the system SHALL show client names, gallery names, and total selections made
3. WHEN a photographer clicks on a specific gallery THEN the system SHALL show detailed folder-by-folder selection counts for that gallery
4. WHEN a photographer views client activity THEN the system SHALL show the last selection date for each client
5. IF a client has made no selections THEN the system SHALL clearly indicate "No selections made"

### Requirement 4

**User Story:** As a photographer, I want to filter and analyze client selection data, so that I can identify patterns and follow up with clients as needed.

#### Acceptance Criteria

1. WHEN a photographer views selection statistics THEN the system SHALL allow filtering by date range, client name, and gallery
2. WHEN a photographer applies filters THEN the system SHALL update the display to show only matching selection data
3. WHEN a photographer sorts selection data THEN the system SHALL allow sorting by selection count, last activity date, and client name
4. IF a client has not made selections recently THEN the system SHALL allow filtering to show inactive clients
5. WHEN a photographer exports selection data THEN the system SHALL provide the data in a downloadable format

### Requirement 5

**User Story:** As a system administrator, I want selection counting data to be properly managed and maintained, so that the feature remains reliable and performant.

#### Acceptance Criteria

1. WHEN selection counts are calculated THEN the system SHALL ensure counts are accurate and consistent with actual photo selections
2. WHEN a photo is deleted from a folder THEN the system SHALL automatically update selection counts if that photo was selected
3. WHEN a folder is deleted THEN the system SHALL remove associated selection count data
4. IF the system detects count inconsistencies THEN it SHALL provide tools to recalculate counts from actual selection data
5. WHEN the system displays selection counts THEN it SHALL ensure calculations are performed efficiently without impacting gallery loading performance