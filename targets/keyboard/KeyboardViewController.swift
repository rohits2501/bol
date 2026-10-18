import UIKit

private let appGroup = "group.dev.rohitsingh.bol"
private let pendingKey = "pendingText"

class KeyboardViewController: UIInputViewController {
    private let statusLabel = UILabel()
    private let dictateButton = UIButton(type: .system)
    private let insertButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.11, green: 0.10, blue: 0.08, alpha: 1)

        statusLabel.textColor = UIColor(red: 0.96, green: 0.94, blue: 0.90, alpha: 1)
        statusLabel.font = .preferredFont(forTextStyle: .body)
        statusLabel.numberOfLines = 0
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        configure(dictateButton, title: "Dictate in Bol", action: #selector(openBol))
        configure(insertButton, title: "Insert", action: #selector(insertPending))

        let stack = UIStackView(arrangedSubviews: [statusLabel, dictateButton, insertButton])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        let height = view.heightAnchor.constraint(equalToConstant: 196)
        height.priority = UILayoutPriority(999)

        NSLayoutConstraint.activate([
            height,
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
        ])
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        refresh()
    }

    private func configure(_ button: UIButton, title: String, action: Selector) {
        var config = UIButton.Configuration.filled()
        config.title = title
        config.baseBackgroundColor = UIColor(red: 0.77, green: 0.32, blue: 0.17, alpha: 1)
        config.baseForegroundColor = .white
        config.cornerStyle = .medium
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16)
        button.configuration = config
        button.addTarget(self, action: action, for: .touchUpInside)
    }

    private func refresh() {
        let pending = pendingText()
        if let pending, !pending.isEmpty {
            statusLabel.text = pending
            insertButton.isEnabled = true
            insertButton.alpha = 1
        } else {
            statusLabel.text = "iOS keyboards cannot use the microphone. Dictate in Bol, then insert the text here."
            insertButton.isEnabled = false
            insertButton.alpha = 0.45
        }
    }

    @objc private func openBol() {
        guard let url = URL(string: "bol://dictate") else { return }
        var responder: UIResponder? = self
        while let next = responder {
            if let application = next as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = next.next
        }
    }

    @objc private func insertPending() {
        guard let text = pendingText(), !text.isEmpty else { return }
        textDocumentProxy.insertText(text)
        UserDefaults(suiteName: appGroup)?.removeObject(forKey: pendingKey)
        refresh()
    }

    private func pendingText() -> String? {
        UserDefaults(suiteName: appGroup)?.string(forKey: pendingKey)
    }
}
