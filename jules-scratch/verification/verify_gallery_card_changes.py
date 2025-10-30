from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log in
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill("photographer@yarrow.com")
    page.get_by_label("Password").fill("yarrow")
    page.get_by_role("button", name="Login").click()

    # Wait for navigation and gallery cards to load
    page.wait_for_url("http://localhost:3000/dashboard")
    page.wait_for_selector(".card", timeout=10000)

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
