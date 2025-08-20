# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_08_20_095059) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "day_on_sets", force: :cascade do |t|
    t.bigint "talent_category_id", null: false
    t.integer "talent_count"
    t.integer "days_count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["talent_category_id"], name: "index_day_on_sets_on_talent_category_id"
  end

  create_table "production_houses", force: :cascade do |t|
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_production_houses_on_code", unique: true
    t.index ["name"], name: "index_production_houses_on_name", unique: true
  end

  create_table "quotation_adjustments", force: :cascade do |t|
    t.bigint "quotation_id", null: false
    t.string "description"
    t.decimal "percentage"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "adjustment_type", default: "discount"
    t.index ["quotation_id"], name: "index_quotation_adjustments_on_quotation_id"
  end

  create_table "quotation_details", force: :cascade do |t|
    t.bigint "quotation_id", null: false
    t.integer "rehearsal_days"
    t.integer "travel_days"
    t.integer "down_days"
    t.string "exclusivity_type"
    t.integer "exclusivity_level"
    t.boolean "pharmaceutical"
    t.string "duration"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "shoot_days", default: 1
    t.string "media_type", default: "all_media"
    t.boolean "unlimited_stills", default: false
    t.boolean "unlimited_versions", default: false
    t.index ["quotation_id"], name: "index_quotation_details_on_quotation_id"
  end

  create_table "quotation_histories", force: :cascade do |t|
    t.bigint "quotation_id", null: false
    t.string "action"
    t.string "user"
    t.json "data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["quotation_id"], name: "index_quotation_histories_on_quotation_id"
  end

  create_table "quotation_territories", force: :cascade do |t|
    t.bigint "quotation_id", null: false
    t.bigint "territory_id", null: false
    t.boolean "unlimited_stills"
    t.boolean "unlimited_versions"
    t.decimal "stills_percentage"
    t.decimal "versions_percentage"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["quotation_id"], name: "index_quotation_territories_on_quotation_id"
    t.index ["territory_id"], name: "index_quotation_territories_on_territory_id"
  end

  create_table "quotations", force: :cascade do |t|
    t.string "project_name", null: false
    t.string "project_number", null: false
    t.bigint "production_house_id", null: false
    t.string "status", default: "draft"
    t.decimal "total_amount", precision: 10, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["production_house_id"], name: "index_quotations_on_production_house_id"
    t.index ["project_number"], name: "index_quotations_on_project_number", unique: true
    t.index ["status"], name: "index_quotations_on_status"
  end

  create_table "settings", force: :cascade do |t|
    t.string "key", null: false
    t.text "value"
    t.string "data_type", default: "string"
    t.string "category"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category"], name: "index_settings_on_category"
    t.index ["key"], name: "index_settings_on_key", unique: true
  end

  create_table "talent_categories", force: :cascade do |t|
    t.bigint "quotation_id", null: false
    t.integer "category_type", null: false
    t.integer "initial_count", default: 0
    t.decimal "daily_rate", precision: 8, scale: 2
    t.decimal "adjusted_rate", precision: 8, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["quotation_id", "category_type"], name: "index_talent_categories_on_quotation_id_and_category_type", unique: true
    t.index ["quotation_id"], name: "index_talent_categories_on_quotation_id"
  end

  create_table "territories", force: :cascade do |t|
    t.string "name", null: false
    t.string "code"
    t.decimal "percentage", precision: 6, scale: 2, default: "100.0"
    t.string "media_type", default: "all_media"
    t.string "group_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_territories_on_code"
    t.index ["group_name"], name: "index_territories_on_group_name"
    t.index ["name", "media_type"], name: "index_territories_on_name_and_media_type", unique: true
  end

  add_foreign_key "day_on_sets", "talent_categories"
  add_foreign_key "quotation_adjustments", "quotations"
  add_foreign_key "quotation_details", "quotations"
  add_foreign_key "quotation_histories", "quotations"
  add_foreign_key "quotation_territories", "quotations"
  add_foreign_key "quotation_territories", "territories"
  add_foreign_key "quotations", "production_houses"
  add_foreign_key "talent_categories", "quotations"
end
