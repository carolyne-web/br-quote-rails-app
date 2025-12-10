Rails.application.routes.draw do
  get "quotations/index"
  root "sessions#new"

  # Password Reset Routes
  get "forgot_password", to: "password_resets#new", as: "forgot_password"
  post "forgot_password", to: "password_resets#create"
  get "forgot_password/admin", to: "password_resets#new", defaults: { user_type: 'admin' }, as: "forgot_password_admin"
  get "password_resets/:id/edit", to: "password_resets#edit", as: "edit_password_reset"
  patch "password_resets/:id", to: "password_resets#update", as: "password_reset"

  # Production House Authentication
  get "login", to: "sessions#new"
  post "login", to: "sessions#create"
  delete "logout", to: "sessions#destroy"

  # Production House Profile
  get "profile", to: "profile#show"
  patch "profile/update_password", to: "profile#update_password"
  patch "profile/update_email", to: "profile#update_email"

  # Admin Authentication
  get "admin/login", to: "sessions#admin_new", as: "admin_login"
  post "admin/login", to: "sessions#admin_create"
  delete "admin/logout", to: "sessions#admin_destroy"
  post "admin/dismiss_welcome", to: "sessions#admin_dismiss_welcome"

  # Admin Routes
  namespace :admin do
    get "territories/index"
    get "territories/new"
    get "territories/create"
    get "territories/edit"
    get "territories/update"
    get "territories/destroy"
    get "dashboard", to: "dashboard#index"
    get "profile", to: "profile#show"
    patch "profile/update_password", to: "profile#update_password"
    patch "profile/update_email", to: "profile#update_email"
    resources :support_requests, only: [:index, :show, :update]
    resources :settings, only: [ :index, :edit, :update, :create, :destroy ] do
      collection do
        patch :bulk_update
      end
    end
    resources :production_houses
    resources :territories do
      collection do
        patch :bulk_update
      end
    end
    resources :territory_media_exceptions, path: 'territory-exceptions', as: 'territory_exceptions'
    resources :quotations, only: [ :index, :show ] do
      member do
        get :pdf
      end
    end
  end

  # Production House Routes (to be added in next steps)
  resources :quotations do
    member do
      get :pdf
      post :duplicate
      post :generate_final # Generate final quotation from form data
    end
    resources :talent_categories
    resources :quotation_territories
    resources :quotation_adjustments
  end

  # Final quotation routes for show functionality only
  resources :final_quotations, only: [:show] do
    member do
      get :pdf
      post :duplicate
    end
  end
  resources :support_requests, only: [:create, :new, :index, :show]

  # API endpoints for dynamic forms (to be added)
  namespace :api do
    namespace :v1 do
      resources :territories, only: [ :index ]
      resources :settings, only: [ :index ]
    end
  end

  # Diagnostics
  get "diagnostics/territories", to: "diagnostics#territories"
  get "diagnostics/media_exceptions", to: "diagnostics#media_exceptions"
end
