#!/usr/bin/env ruby

# Comprehensive test script for Add Line, Add Group, and Search functionality
# Run this with: ruby test_feature_functionality.rb

require 'net/http'
require 'uri'
require 'json'
require 'cgi'

class FeatureTester
  def initialize(base_url = 'http://localhost:3000')
    @base_url = base_url
    @cookies = {}
  end

  def test_all_features
    puts "🧪 Starting comprehensive feature testing..."

    # First, try to login
    login_success = test_login
    return unless login_success

    puts "\n=== Testing Add Line Functionality ==="
    test_add_line_functionality

    puts "\n=== Testing Add Group Functionality ==="
    test_add_group_functionality

    puts "\n=== Testing Search Functionality ==="
    test_search_functionality

    puts "\n✅ Feature testing completed!"
  end

  private

  def test_login
    puts "🔐 Testing login..."

    # Get login page to get CSRF token
    response = make_request('GET', '/login')
    unless response.code == '200'
      puts "❌ Failed to get login page: #{response.code}"
      return false
    end

    # Extract CSRF token
    csrf_token = extract_csrf_token(response.body)
    unless csrf_token
      puts "❌ Could not extract CSRF token"
      return false
    end

    # Save cookies from login page
    save_cookies(response['Set-Cookie'])

    # Attempt login with demo credentials
    login_data = {
      'authenticity_token' => csrf_token,
      'code' => 'DEMO001',
      'password' => 'demo123',
      'commit' => 'Sign in'
    }

    response = make_request('POST', '/login', login_data)

    if response.code == '302' && response['Location']&.include?('quotations')
      puts "✅ Login successful"
      save_cookies(response['Set-Cookie'])
      return true
    else
      puts "❌ Login failed: #{response.code} - #{response.body[0..200]}"
      return false
    end
  end

  def test_add_line_functionality
    puts "🔧 Testing Add Line functionality..."

    # Get new quotation page
    response = make_request('GET', '/quotations/new')

    if response.code == '200'
      puts "✅ New quotation page loads"

      # Check if Add Line button exists
      if response.body.include?('add-line-btn') && response.body.include?('+ Line')
        puts "✅ Add Line button found in HTML"
      else
        puts "❌ Add Line button NOT found in HTML"
      end

      # Check if addTalentLine function exists in JavaScript
      if response.body.include?('addTalentLine')
        puts "✅ addTalentLine JavaScript function found"
      else
        puts "❌ addTalentLine JavaScript function NOT found"
      end

      # Check for talent input row structure
      if response.body.include?('talent-input-row') && response.body.include?('additional-lines')
        puts "✅ Talent line structure found"
      else
        puts "❌ Talent line structure NOT found"
      end

    else
      puts "❌ Failed to load new quotation page: #{response.code}"
    end
  end

  def test_add_group_functionality
    puts "🔧 Testing Add Group functionality..."

    # Get new quotation page
    response = make_request('GET', '/quotations/new')

    if response.code == '200'
      puts "✅ New quotation page loads"

      # Check if Add Group button exists
      if response.body.include?('add-combination') && response.body.include?('+ Add Group')
        puts "✅ Add Group button found in HTML"
      else
        puts "❌ Add Group button NOT found in HTML"
      end

      # Check for combination structure
      if response.body.include?('combination-section') || response.body.include?('combinations')
        puts "✅ Combination/Group structure found"
      else
        puts "❌ Combination/Group structure NOT found"
      end

      # Check if JavaScript handler exists
      if response.body.include?('add-combination') || response.body.include?('addCombination')
        puts "✅ Add Group JavaScript handling found"
      else
        puts "❌ Add Group JavaScript handling NOT found"
      end

    else
      puts "❌ Failed to load new quotation page: #{response.code}"
    end
  end

  def test_search_functionality
    puts "🔍 Testing Search functionality..."

    # Test quotations index page
    response = make_request('GET', '/quotations')

    if response.code == '200'
      puts "✅ Quotations index page loads"

      # Check for search input or functionality
      if response.body.include?('search') || response.body.include?('filter')
        puts "✅ Search functionality found"
      else
        puts "❌ Search functionality NOT found"
      end

    else
      puts "❌ Failed to load quotations index: #{response.code}"
    end

    # Test admin quotations page if accessible
    response = make_request('GET', '/admin/quotations')

    if response.code == '200'
      puts "✅ Admin quotations page loads"

      # Check for search input
      if response.body.include?('search') || response.body.include?('filter')
        puts "✅ Admin search functionality found"
      else
        puts "❌ Admin search functionality NOT found"
      end

    else
      puts "🔒 Admin quotations page not accessible (expected for production house user)"
    end
  end

  def make_request(method, path, data = nil)
    uri = URI("#{@base_url}#{path}")

    case method.upcase
    when 'GET'
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Get.new(uri)
    when 'POST'
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri)
      if data
        request.body = URI.encode_www_form(data)
        request['Content-Type'] = 'application/x-www-form-urlencoded'
      end
    end

    # Add cookies
    if @cookies.any?
      request['Cookie'] = @cookies.map { |k, v| "#{k}=#{v}" }.join('; ')
    end

    request['User-Agent'] = 'FeatureTester/1.0'

    begin
      response = http.request(request)
      response
    rescue => e
      puts "❌ Request failed: #{e.message}"
      nil
    end
  end

  def save_cookies(cookie_header)
    return unless cookie_header

    cookie_header.split(',').each do |cookie|
      parts = cookie.split(';').first.strip.split('=', 2)
      if parts.length == 2
        @cookies[parts[0]] = parts[1]
      end
    end
  end

  def extract_csrf_token(html)
    # Look for CSRF token in meta tag
    if match = html.match(/name="csrf-token" content="([^"]+)"/)
      return match[1]
    end

    # Look for CSRF token in form
    if match = html.match(/name="authenticity_token" value="([^"]+)"/)
      return match[1]
    end

    nil
  end
end

# Run the tests
if __FILE__ == $0
  tester = FeatureTester.new
  tester.test_all_features
end